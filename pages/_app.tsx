import '@/styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { FrappeProvider } from 'frappe-react-sdk';
const inter = Inter({ subsets: ['latin'] });

function App({ Component, pageProps }: AppProps<{}>) {
  return (
    <div className={inter.className}>
      <FrappeProvider url='http://vector.localhost:8000'>
        <Toaster />
        <Component {...pageProps} />
      </FrappeProvider>
    </div>
  );
}

export default appWithTranslation(App);
