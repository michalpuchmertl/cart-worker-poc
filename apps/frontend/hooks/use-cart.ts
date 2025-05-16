import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Cart,
  Product,
  WorkerRequest,
  WorkerResponse,
  AddItemPayload,
  RemoveItemPayload,
} from "@cart-poc/common";

const WORKER_SCRIPT_URL = "http://localhost:8081/cart-worker.js";

let workerInstance: Worker | null = null;
let blobUrl: string | null = null;
let listeners: Array<(event: MessageEvent<WorkerResponse>) => void> = [];
let workerInitPromise: Promise<Worker | null> | null = null;

async function getWorkerInstance(): Promise<Worker | null> {
  if (workerInstance) {
    return workerInstance;
  }

  if (workerInitPromise) {
    return workerInitPromise;
  }

  workerInitPromise = (async () => {
    try {
      console.log(
        `[WorkerManager] Fetching worker script from URL: ${WORKER_SCRIPT_URL}`
      );
      const response = await fetch(WORKER_SCRIPT_URL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch worker script: ${response.status} ${response.statusText}`
        );
      }
      const workerScriptText = await response.text();
      const newBlob = new Blob([workerScriptText], {
        type: "application/javascript",
      });
      blobUrl = URL.createObjectURL(newBlob);

      console.log(
        `[WorkerManager] Initializing worker from Blob URL: ${blobUrl}`
      );
      const newWorker = new Worker(blobUrl, { type: "module" });

      newWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        listeners.forEach((listener) => listener(event));
      };
      newWorker.onerror = (errorEvent: ErrorEvent) => {
        console.error(
          "[WorkerManager] Worker instance error:",
          errorEvent.message,
          errorEvent
        );

        const errorResponse: WorkerResponse = {
          type: "WORKER_ERROR",
          payload: `Worker runtime error: ${errorEvent.message}`,
        };
        listeners.forEach((listener) =>
          listener({ data: errorResponse } as MessageEvent<WorkerResponse>)
        );
      };
      workerInstance = newWorker;
      // initial card load
      workerInstance.postMessage({ type: "LOAD_CART" } as WorkerRequest);
      return workerInstance;
    } catch (e: any) {
      console.error("[WorkerManager] Failed to initialize worker:", e);
      blobUrl = null;
      workerInitPromise = null;
      throw e;
    }
  })();
  return workerInitPromise;
}

function addWorkerListener(
  listener: (event: MessageEvent<WorkerResponse>) => void
) {
  listeners.push(listener);
}

function removeWorkerListener(
  listener: (event: MessageEvent<WorkerResponse>) => void
) {
  listeners = listeners.filter((l) => l !== listener);
}

function postMessageToWorker(message: WorkerRequest) {
  getWorkerInstance()
    .then((worker) => {
      if (worker) {
        worker.postMessage(message);
      } else {
        console.error(
          "[useCart] Worker not available to post message:",
          message.type
        );
      }
    })
    .catch((error) => {
      console.error(
        "[useCart] Failed to get worker instance for posting message:",
        error
      );
    });
}

export function useCart() {
  const queryClient = useQueryClient();
  const [initialLoadingError, setInitialLoadingError] = useState<string | null>(
    null
  );

  useEffect(() => {
    getWorkerInstance().catch((err) => {
      console.error("[useCart] Initial worker fetch failed:", err.message);
      setInitialLoadingError(err.message || "Failed to load cart worker.");
    });

    const handleWorkerMessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;
      console.log("[useCart-Hook] Message from worker:", type, payload);

      if (type === "CART_UPDATED") {
        queryClient.setQueryData(["cart"], payload as Cart);
        setInitialLoadingError(null);
      } else if (type === "WORKER_ERROR") {
        console.error("[useCart-Hook] Worker reported error:", payload);
        if (queryClient.getQueryData(["cart"]) === undefined) {
          setInitialLoadingError(payload as string);
        }
      }
    };

    addWorkerListener(handleWorkerMessage);
    return () => {
      removeWorkerListener(handleWorkerMessage);
    };
  }, [queryClient]);

  const {
    data: cart,
    isLoading: isCartLoading,
    isError: isCartError,
    error: cartError,
  } = useQuery<Cart, Error, Cart, ["cart"]>({
    queryFn: async () => {
      console.log('[useCart-QueryFn] queryFn called for "cart".');
      const currentCart = queryClient.getQueryData<Cart>(["cart"]);
      if (currentCart) {
        return currentCart;
      }
      postMessageToWorker({ type: "LOAD_CART" });
      return { items: [], totalAmount: 0 };
    },
    queryKey: ["cart"],
    initialData: () =>
      queryClient.getQueryData(["cart"]) || { items: [], totalAmount: 0 },
    // data is pushed from worker
    staleTime: Infinity,
  });

  const { mutate: addItem } = useMutation<void, Error, Product>({
    mutationFn: async (productToAdd: Product) => {
      postMessageToWorker({
        type: "ADD_ITEM",
        payload: productToAdd as AddItemPayload,
      });
    },
    onSuccess: () => {
      // todo: optimistic update
      console.log("[useCart-Mutation] Add item message sent.");
    },
    onError: (err) => {
      console.error(
        "[useCart-Mutation] Add item failed locally (e.g. worker init failed):",
        err
      );
    },
  });

  const { mutate: removeItem } = useMutation<void, Error, string>({
    mutationFn: async (productId: string) => {
      postMessageToWorker({
        type: "REMOVE_ITEM",
        payload: { productId } as RemoveItemPayload,
      });
    },
    onSuccess: () =>
      console.log("[useCart-Mutation] Remove item message sent."),
    onError: (err) =>
      console.error("[useCart-Mutation] Remove item failed locally:", err),
  });

  const { mutate: clearCart } = useMutation<void, Error, void>({
    mutationFn: async () => {
      postMessageToWorker({ type: "CLEAR_CART" });
    },
    onSuccess: () => console.log("[useCart-Mutation] Clear cart message sent."),
    onError: (err) =>
      console.error("[useCart-Mutation] Clear cart failed locally:", err),
  });

  const refreshCart = useCallback(() => {
    console.log("[useCart-Hook] Manually refreshing cart data...");
    postMessageToWorker({ type: "LOAD_CART" });
  }, []);

  const isLoading = isCartLoading || initialLoadingError !== null;
  const error = cartError?.message || initialLoadingError;

  return {
    cart: cart || { items: [], totalAmount: 0 },
    isLoading,
    error,
    addItem,
    removeItem,
    clearCart,
    refreshCart,
  };
}
