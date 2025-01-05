import { formatCurrency } from './utils';
import { redirect } from 'next/navigation';
import { getAccessToken, getApiUrl } from './apiConfig';
import { UnauthorizedError } from '../lib/errors';

export async function fetchCardData() {
  let numberOfCustomers = 0;
  let numberOfInvoices = 0;
  let totalPaidInvoices = '0';
  let totalPendingInvoices = '0';
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    // const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    // const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    // const invoiceStatusPromise = sql`SELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices`;

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await Promise.all([
      await fetch(apiUrl + '/invoices/count', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
      await fetch(apiUrl + '/customers/count', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
      await fetch(apiUrl + '/invoices/status/count', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    for (const response of res) {
      if (!response.ok) {
        if (response.status === 401) {
          throw new UnauthorizedError();
        }
        throw new Error('Failed to fetch card data.');
      }
    }

    const data = await Promise.all(res.map((response) => response.json()));

    numberOfInvoices = Number(data[0] ?? '0');
    numberOfCustomers = Number(data[1] ?? '0');
    totalPaidInvoices = formatCurrency(data[2].paid ?? '0');
    totalPendingInvoices = formatCurrency(data[2].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return {
    numberOfCustomers,
    numberOfInvoices,
    totalPaidInvoices,
    totalPendingInvoices,
  };
}
