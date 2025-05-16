/// <reference lib="webworker" />
import type {
  Cart,
  Product,
  WorkerRequest,
  WorkerResponse,
  AddItemPayload,
  RemoveItemPayload,
} from "@cart-poc/common";

const API_BASE_URL = "http://localhost:3001/api"; // Backend API
const UPDATE_INTERVAL = 5000;
let intervalId: number | undefined;

declare const self: DedicatedWorkerGlobalScope;

async function fetchCart(): Promise<void> {
  console.log("[Worker] Fetching cart data (periodic or on-demand)...");
  try {
    const response = await fetch(`${API_BASE_URL}/cart`);
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to fetch cart." }));
      throw new Error(errorData.message || "Failed to fetch cart.");
    }
    const cartData = (await response.json()) as Cart;
    self.postMessage({
      type: "CART_UPDATED",
      payload: cartData,
    } as WorkerResponse);
  } catch (error: any) {
    console.error("[Worker] Error fetching cart:", error.message);
    self.postMessage({
      type: "WORKER_ERROR",
      payload: error.message,
    } as WorkerResponse);
  }
}

function startPeriodicCartUpdates(): void {
  if (intervalId) {
    self.clearInterval(intervalId);
    console.log("[Worker] Cleared existing cart update interval.");
  }
  // Start new interval
  intervalId = self.setInterval(fetchCart, UPDATE_INTERVAL);
  console.log(
    `[Worker] Started new cart update interval. ID: ${intervalId}, Interval: ${UPDATE_INTERVAL}ms`
  );
}

async function addItemToCart(product: AddItemPayload): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `Failed to add item: ${product.name}` }));
      throw new Error(
        errorData.message || `Failed to add item: ${product.name}`
      );
    }
    const updatedCart = (await response.json()) as Cart;
    self.postMessage({
      type: "ITEM_ADDED_SUCCESS",
      payload: { message: "item added", detail: updatedCart },
    } as WorkerResponse);
    self.postMessage({
      type: "CART_UPDATED",
      payload: updatedCart,
    } as WorkerResponse);
  } catch (error: any) {
    console.error("[Worker] Error adding item:", error.message);
    self.postMessage({
      type: "WORKER_ERROR",
      payload: error.message,
    } as WorkerResponse);
  }
}

async function removeItemFromCart(productId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/cart/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `Failed to remove item ID: ${productId}` }));
      throw new Error(
        errorData.message || `Failed to remove item ID: ${productId}`
      );
    }
    const updatedCart = (await response.json()) as Cart;
    self.postMessage({
      type: "ITEM_REMOVED_SUCCESS",
      payload: { message: "item removed", detail: updatedCart },
    } as WorkerResponse);
    self.postMessage({
      type: "CART_UPDATED",
      payload: updatedCart,
    } as WorkerResponse);
  } catch (error: any) {
    console.error("[Worker] Error removing item:", error.message);
    self.postMessage({
      type: "WORKER_ERROR",
      payload: error.message,
    } as WorkerResponse);
  }
}

async function clearCart(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/cart/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to clear cart." }));
      throw new Error(errorData.message || "Failed to clear cart.");
    }
    const updatedCart = (await response.json()) as Cart;
    self.postMessage({
      type: "CART_CLEARED_SUCCESS",
      payload: { message: "cart cleared", detail: updatedCart },
    } as WorkerResponse);
    self.postMessage({
      type: "CART_UPDATED",
      payload: updatedCart,
    } as WorkerResponse);
  } catch (error: any) {
    console.error("[Worker] Error clearing cart:", error.message);
    self.postMessage({
      type: "WORKER_ERROR",
      payload: error.message,
    } as WorkerResponse);
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;
  console.log("[Worker] Message received from main thread:", type, payload);

  switch (type) {
    case "LOAD_CART":
      await fetchCart();
      startPeriodicCartUpdates();
      break;
    case "ADD_ITEM":
      await addItemToCart(payload as AddItemPayload);
      break;
    case "REMOVE_ITEM":
      await removeItemFromCart((payload as RemoveItemPayload).productId);
      break;
    case "CLEAR_CART":
      await clearCart();
      break;
    default:
      console.warn("[Worker] Unknown message type received:", type);
      self.postMessage({
        type: "WORKER_ERROR",
        payload: `Unknown action type: ${type}`,
      } as WorkerResponse);
  }
};

async function initializeWorker() {
  console.log(
    "[Worker] Worker started. Initializing cart and periodic updates."
  );
  await fetchCart(); // Perform an initial fetch
  startPeriodicCartUpdates(); // Start the periodic updates
}

initializeWorker().catch((error) => {
  console.error("[Worker] Error during worker initialization:", error);
  self.postMessage({
    type: "WORKER_ERROR",
    payload: "Worker initialization failed.",
  } as WorkerResponse);
});

console.log("[Worker] Event listener for messages is set up.");
