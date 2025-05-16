// commands from next to worker
export type WorkerActionType =
  | "LOAD_CART"
  | "ADD_ITEM"
  | "REMOVE_ITEM"
  | "CLEAR_CART";

// events from worker to next
export type WorkerEventType =
  | "CART_UPDATED"
  | "ITEM_ADDED_SUCCESS"
  | "ITEM_REMOVED_SUCCESS"
  | "CART_CLEARED_SUCCESS"
  | "WORKER_ERROR";

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
}

export interface AddItemPayload extends Product {}
export interface RemoveItemPayload {
  productId: string;
}

export interface WorkerRequest {
  type: WorkerActionType;
  payload?: AddItemPayload | RemoveItemPayload | unknown;
}

export interface WorkerResponse {
  type: WorkerEventType;
  payload: Cart | string | { message?: string; detail?: any };
}
