import express, { Express, Request, Response } from "express";
import cors from "cors";
import type { Cart, Product, CartItem } from "@cart-poc/common";

const app: Express = express();
const port: number = 3001;

const allowedOrigins = ["http://localhost:3000", "http://localhost:8081"];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("cors err"), false);
    }
    return callback(null, true);
  },
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

interface AddToCartRequestBody {
  product: Product;
}
interface RemoveFromCartRequestBody {
  productId: string;
}

let cart: Cart = {
  items: [],
  totalAmount: 0,
};

function recalculateCartTotal(): void {
  cart.totalAmount = cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  );
}

app.get("/api/cart", (req: Request, res: Response<Cart>) => {
  console.log(
    "[Backend] GET /api/cart - sending cart:",
    JSON.stringify(cart, null, 2)
  );
  res.json(cart);
});

app.post(
  "/api/cart/add",
  (
    req: Request<{}, Cart | { message: string }, AddToCartRequestBody>,
    res: Response<Cart | { message: string }>
  ) => {
    const { product } = req.body;
    if (
      !product ||
      !product.id ||
      !product.name ||
      typeof product.price !== "number"
    ) {
      return res.status(400).json({ message: "invalid product data" });
    }
    const existingItemIndex = cart.items.findIndex(
      (item) => item.id === product.id
    );
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += 1;
    } else {
      cart.items.push({ ...product, quantity: 1 });
    }
    recalculateCartTotal();
    console.log("[Backend] POST /api/cart/add - product added:", product.name);
    res.status(200).json(cart);
  }
);

app.post(
  "/api/cart/remove",
  (
    req: Request<{}, Cart | { message: string }, RemoveFromCartRequestBody>,
    res: Response<Cart | { message: string }>
  ) => {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "id is required" });
    }
    const itemIndex = cart.items.findIndex((item) => item.id === productId);
    if (itemIndex > -1) {
      const item = cart.items[itemIndex];
      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        cart.items.splice(itemIndex, 1);
      }
      recalculateCartTotal();
      console.log(
        "[Backend] POST /api/cart/remove - id removed/decremented:",
        productId
      );
      res.status(200).json(cart);
    } else {
      res.status(404).json({ message: "product not found" });
    }
  }
);

app.post("/api/cart/clear", (req: Request, res: Response<Cart>) => {
  cart = { items: [], totalAmount: 0 };
  console.log("[Backend] POST /api/cart/clear - cart flushed");
  res.status(200).json(cart);
});

app.listen(port, () => {
  console.log(`[Backend] running on http://localhost:${port}`);
});
