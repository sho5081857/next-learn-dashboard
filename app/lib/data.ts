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
import { redirect } from 'next/navigation';
import { getAccessToken, getApiUrl } from './apiConfig';

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

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/revenues', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const data = await res.json();

    // console.log('Data fetch completed after 3 seconds.');

    return data as Revenue[];
  } catch (error) {
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

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/invoices/latest', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const data = (await res.json()) as LatestInvoiceRaw[];

    const latestInvoices = data.map((invoice: LatestInvoiceRaw) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
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
      await fetch(apiUrl + '/invoices/statusCount', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    if (
      res.some((response) => response.status === 401 || response.status === 403)
    ) {
      redirect('/sign-out');
    }

    const data = await Promise.all(res.map((response) => response.json()));

    const numberOfInvoices = Number(data[0] ?? '0');
    const numberOfCustomers = Number(data[1] ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error: any) {
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
    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(
      apiUrl + '/invoices/filtered?page=' + currentPage + '&query=' + query,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const data = await res.json();

    return data as InvoicesTable[];
  } catch (error) {
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

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/invoices/pages?query=' + query, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const count = await res.json();

    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
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

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/invoices/' + id, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const data = (await res.json()) as InvoiceForm;

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

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/customers', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const customers = (await res.json()) as CustomerField[];

    return customers;
  } catch (error) {
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
    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/customers/filtered?query=' + query, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }

    const data = (await res.json()) as CustomersTableType[];

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (error) {
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
