import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';
import axios from 'axios';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await sql<Revenue>`SELECT * FROM revenue`;

    // 外部APIにリクエストを送信
    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }

    const session = await auth();
    const token = session?.accessToken;
    const response = await axios.get(apiUrl + '/revenues', {
      timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
    });
    // console.log('Data fetch completed after 3 seconds.');

    return response.data as Revenue[];
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();
  try {
    // const data = await sql<LatestInvoiceRaw>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }

    const session = await auth();
    const token = session?.accessToken;
    const response = await axios.get(apiUrl + '/invoices/latest', {
      timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = response.data as LatestInvoiceRaw[];

    const latestInvoices = data.map((invoice: LatestInvoiceRaw) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();
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

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }
    const session = await auth();
    const token = session?.accessToken;

    const response = await Promise.all([
      axios.get(apiUrl + '/invoices/count', {
        timeout: 1000,
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(apiUrl + '/customers/count', {
        timeout: 1000,
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(apiUrl + '/invoices/statusCount', {
        timeout: 1000,
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const numberOfInvoices = Number(response[0].data ?? '0');
    const numberOfCustomers = Number(response[1].data ?? '0');
    const totalPaidInvoices = formatCurrency(response[2].data.paid ?? '0');
    const totalPendingInvoices = formatCurrency(
      response[2].data.pending ?? '0',
    );

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // const invoices = await sql<InvoicesTable>`
    // SELECT
    //   invoices.id,
    //   invoices.amount,
    //   invoices.date,
    //   invoices.status,
    //   customers.name,
    //   customers.email,
    //   customers.image_url
    // FROM invoices
    // JOIN customers ON invoices.customer_id = customers.id
    // WHERE
    //   customers.name ILIKE ${`%${query}%`} OR
    //   customers.email ILIKE ${`%${query}%`} OR
    //   invoices.amount::text ILIKE ${`%${query}%`} OR
    //   invoices.date::text ILIKE ${`%${query}%`} OR
    //   invoices.status ILIKE ${`%${query}%`}
    // ORDER BY invoices.date DESC
    // LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    // `;

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }
    const session = await auth();
    const token = session?.accessToken;

    const response = await axios.get(
      apiUrl + '/invoices/filtered?page=' + currentPage + '&query=' + query,
      {
        timeout: 1000,
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const invoices = response.data as InvoicesTable[];

    return invoices;
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  noStore();
  try {
    //   const count = await sql`SELECT COUNT(*)
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   WHERE
    //     customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`} OR
    //     invoices.amount::text ILIKE ${`%${query}%`} OR
    //     invoices.date::text ILIKE ${`%${query}%`} OR
    //     invoices.status ILIKE ${`%${query}%`}
    // `;

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }

    const session = await auth();
    const token = session?.accessToken;
    const response = await axios.get(
      apiUrl + '/invoices/pages?query=' + query,
      {
        timeout: 1000,
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const count = response.data;

    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();
  try {
    // const data = await sql<InvoiceForm>`
    //   SELECT
    //     invoices.id,
    //     invoices.customer_id,
    //     invoices.amount,
    //     invoices.status
    //   FROM invoices
    //   WHERE invoices.id = ${id};
    // `;

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }
    const session = await auth();
    const token = session?.accessToken;
    const response = await axios.get(apiUrl + '/invoices/' + id, {
      timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = response.data as InvoiceForm;

    // const invoice = data.map((invoice) => ({
    //   ...invoice,
    //   // Convert amount from cents to dollars
    //   amount: invoice.amount / 100,
    // }));
    data.amount = data.amount / 100;
    return data;
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();
  try {
    // const data = await sql<CustomerField>`
    //   SELECT
    //     id,
    //     name
    //   FROM customers
    //   ORDER BY name ASC
    // `;

    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }

    const session = await auth();
    const token = session?.accessToken;
    const response = await axios.get(apiUrl + '/customers', {
      timeout: 1000,
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = response.data as CustomerField[];
    const customers = data;
    return customers;
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  try {
    // const data = await sql<CustomersTableType>`
    // SELECT
    //   customers.id,
    //   customers.name,
    //   customers.email,
    //   customers.image_url,
    //   COUNT(invoices.id) AS total_invoices,
    //   SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
    //   SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
    // FROM customers
    // LEFT JOIN invoices ON customers.id = invoices.customer_id
    // WHERE
    //   customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`}
    // GROUP BY customers.id, customers.name, customers.email, customers.image_url
    // ORDER BY customers.name ASC
    // `;
    const apiUrl = process.env.API_URL;
    if (!apiUrl) {
      throw new Error('API_URL is not defined.');
    }

    const session = await auth();
    const token = session?.accessToken;
    const response = await axios.get(
      apiUrl + '/customers/filtered?query=' + query,
      {
        timeout: 1000,
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data = response.data as CustomersTableType[];
    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (error: any) {
    const { status } = error.response;
    if (status === 401 || status === 403) {
      redirect('/sign-out');
    }
    throw new Error('Failed to fetch customer table.');
  }
}

// export async function getUser(email: string) {
//   try {
//     // const user = await sql`SELECT * FROM users WHERE email=${email}`;

//      const apiUrl = process.env.API_URL;
//      if (!apiUrl) {
//        throw new Error('API_URL is not defined.');
//      }

//      const response = await axios.get(apiUrl + '/users/email/'+ email);
//      const user = response.data;
//     return user as User;
//   } catch (error) {
//     console.error('Failed to fetch user:', error);
//     throw new Error('Failed to fetch user.');
//   }
// }
