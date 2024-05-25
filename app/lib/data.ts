import {
  CustomerField,
  CustomersTableType,
  FormattedCustomersTable,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, getNextPublicApiUrl } from './apiConfig';
import { UnauthorizedError } from '../lib/errors';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();
  let data = [] as Revenue[];
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await sql<Revenue>`SELECT * FROM revenue`;

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(nextPublicApiUrl + '/revenues', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // console.log('Data fetch completed after 3 seconds.');

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch revenue data.');
    }
    data = await res.json();
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return data;
}

export async function fetchLatestInvoices() {
  noStore();
  let latestInvoices = [] as LatestInvoice[];
  try {
    // const data = await sql<LatestInvoiceRaw>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(nextPublicApiUrl + '/invoices/latest', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch the latest invoices.');
    }

    const data = (await res.json()) as LatestInvoiceRaw[];

    latestInvoices = data.map((invoice: LatestInvoiceRaw) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return latestInvoices;
}

export async function fetchCardData() {
  noStore();
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

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await Promise.all([
      await fetch(nextPublicApiUrl + '/invoices/count', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
      await fetch(nextPublicApiUrl + '/customers/count', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }),
      await fetch(nextPublicApiUrl + '/invoices/statusCount', {
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

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  noStore();
  let data = [] as InvoicesTable[];
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

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(
      nextPublicApiUrl +
        '/invoices/filtered?page=' +
        currentPage +
        '&query=' +
        query +
        '&limit=' +
        ITEMS_PER_PAGE +
        '&offset=' +
        offset,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch invoices.');
    }

    data = await res.json();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return data;
}

export async function fetchInvoicesPages(query: string) {
  noStore();
  let totalPages = 0;
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

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(
      nextPublicApiUrl + '/invoices/pages?query=' + query,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch total number of invoices.');
    }

    const count = await res.json();

    totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return totalPages;
}

export async function fetchInvoiceById(id: string) {
  noStore();
  let data = {} as InvoiceForm;
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

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(nextPublicApiUrl + '/invoices/' + id, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch invoice.');
    }

    data = (await res.json()) as InvoiceForm;
    data.amount = data.amount / 100;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return data;
}

export async function fetchCustomers() {
  noStore();
  let data = [] as CustomerField[];
  try {
    // const data = await sql<CustomerField>`
    //   SELECT
    //     id,
    //     name
    //   FROM customers
    //   ORDER BY name ASC
    // `;

    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(nextPublicApiUrl + '/customers', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch all customers.');
    }

    data = await res.json();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return data;
}

export async function fetchFilteredCustomers(query: string) {
  noStore();
  let customers = [] as FormattedCustomersTable[];
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
    const nextPublicApiUrl = await getNextPublicApiUrl();
    const token = await getAccessToken();

    const res = await fetch(
      nextPublicApiUrl + '/customers/filtered?query=' + query,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch customer table.');
    }

    const data = (await res.json()) as CustomersTableType[];

    customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return customers;
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
