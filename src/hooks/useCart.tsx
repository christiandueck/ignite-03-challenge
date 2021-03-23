import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let updatedCart: Product[] = [];
      let productIndex: number = 0;

      const product = cart.find(({ id }, index) => {
        if (id === productId) productIndex = index;
        return id === productId;
      })

      if (!product) {
        const { data: newProduct } = await api.get<Product>('/products/' + productId);

        if (!newProduct) {
          throw Error('Produto inexistente!')
        }

        updatedCart = [
          ...cart,
          {
            ...newProduct,
            amount: 1,
          }
        ];

      } else {

        const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

        if (product.amount + 1 > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        updatedCart = [...cart];
        updatedCart.splice(productIndex, 1, {
          ...product,
          amount: 1 + product.amount,
        });

      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      setCart(updatedCart);

    } catch {

      toast.error('Erro na adição do produto');

    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter(({ id }) => id !== productId);

      if (newCart.length === cart.length) {
        throw Error('Produto inexistente no carrinho.');
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);
    } catch (err) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      let productIndex: number = 0;

      const product = cart.find(({ id }, index) => {
        if (id === productId) productIndex = index;
        return id === productId;
      });

      if (product) {
        const { data: productStock } = await api.get<Stock>(`/stock/${productId}`);

        if (amount > productStock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        } else if (amount <= 0) {
          throw Error('Quantidade inválida.');
        }

        let newCart = [...cart];
        newCart.splice(productIndex, 1, {
          ...product,
          amount,
        });

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);

      } else {
        throw Error('Produto inexistente!')
      }

    } catch (err) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
