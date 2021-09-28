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
      const productAlredyExist = cart.find(p => p.id === productId)

      if(!productAlredyExist) {
        const { data: product } = await api.get(`/products/${productId}`)
        const { data: stock } = await api.get(`/stock/${productId}`)

        if(stock.amount > 0) {
          setCart([...cart, {...product, amount: 1}])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product, amount: 1}]))
          toast('Adicionando')
          return
        }
      }

      if(productAlredyExist) {
        const { data: stock } = await api.get(`/stock/${productId}`)

        if(stock.amount > productAlredyExist.amount) {
          const updatedCart = cart.map(Item => Item.id === productId ? { 
            ...Item,
            amount: Number(Item.amount) + 1
          } : Item)

          setCart(updatedCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
          return
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
        const cartItem = cart.some(item => item.id === productId)

        if(!cartItem) {
          toast.error('Erro na remoção do produto');
          return
        }
        
        const cartRemove = cart.filter(item => item.id !== productId)
        setCart(cartRemove)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartRemove))
      } catch {
        toast.error('Erro na remoção do produto');
      }
    };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      const response = await api.get(`/stock/${productId}`);
      const productAmount = response.data.amount;
      const stockFree = amount > productAmount

      if(stockFree){
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const ProductExist = cart.some(cartProduct => cartProduct.id === productId)
      if(!ProductExist) {
        toast.error('Erro na alteração de quantidade do produto');
        return
      }

      const updateCart= cart.map(cartItem => cartItem.id === productId ? {
        ...cartItem,
        amount: amount
      } : cartItem)
      setCart(updateCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
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
