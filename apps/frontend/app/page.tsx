"use client";

import React from "react";
import { useCart } from "@/hooks/use-cart";
import type { Product } from "@cart-poc/common";

const productsData: Product[] = [
  { id: "prod1", name: "vino", price: 299 },
  { id: "prod2", name: "rum", price: 599 },
  { id: "prod3", name: "darkovy poukaz", price: 500 },
];

export default function HomePage() {
  const {
    cart,
    isLoading,
    error,
    addItem,
    removeItem,
    clearCart,
    refreshCart,
  } = useCart();

  return (
    <div className="container mx-auto px-4 min-h-screen flex flex-col items-center py-8">
      <main className="w-full max-w-5xl">
        <h1 className="text-4xl font-bold text-cente mb-10">košík webworker</h1>

        {error && (
          <div
            className="bg-red-100 border-red-500 text-red-700 p-4 mb-6"
            role="alert"
          >
            <p className="font-bold">err</p>
            <p>{error}</p>
          </div>
        )}

        {isLoading && cart.items.length === 0 && (
          <p className="text-center text-gray-600 text-lg my-8">cart init</p>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg transition-shadow duration-300">
            <h2 className="text-3xl font-semibold mb-6 text-gray-800 border-b pb-3">
              produkty
            </h2>
            <div className="space-y-5">
              {productsData.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-lg text-gray-800">
                      {product.name}
                    </p>
                    <p className="text-md text-gray-600">
                      {product.price.toLocaleString("cs-CZ", {
                        style: "currency",
                        currency: "CZK",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => addItem(product)}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white font-semibold py-2 px-5 rounded-lg"
                  >
                    pridat
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-3xl font-semibold mb-6 text-gray-800 border-b pb-3 flex justify-between items-center">
              kosik
              {isLoading && cart.items.length > 0 && (
                <span className="text-sm font-normal text-gray-500 animate-pulse">
                  loading....
                </span>
              )}
            </h2>
            {cart.items.length === 0 && !isLoading ? (
              <p className="text-gray-500 text-center py-4">nic tu neni</p>
            ) : (
              <>
                <ul className="space-y-4 mb-6">
                  {cart.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div>
                        <span className="font-medium text-gray-800">
                          {item.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {" "}
                          (x{item.quantity})
                        </span>
                        <p className="text-xs text-gray-500">
                          {(item.price * item.quantity).toLocaleString(
                            "cs-CZ",
                            {
                              style: "currency",
                              currency: "CZK",
                            }
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isLoading}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium py-1.5 px-3 rounded-md cursor-pointer"
                      >
                        odstranit
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-200 pt-6">
                  <p className="text-2xl font-bold text-right text-gray-900 mb-5">
                    celkem:{" "}
                    {cart.totalAmount.toLocaleString("cs-CZ", {
                      style: "currency",
                      currency: "CZK",
                    })}
                  </p>
                  <button
                    onClick={() => clearCart()}
                    disabled={isLoading || cart.items.length === 0}
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg cursor-pointer"
                  >
                    vyprazdnit kosik
                  </button>
                </div>
              </>
            )}
            <button
              onClick={refreshCart}
              disabled={isLoading}
              className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg cursor-pointer"
            >
              obnovit kosik
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
