'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { getAccessToken, getApiUrl } from './apiConfig';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

// This is temporary
export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date();

  // Insert data into the database
  try {
    // await sql`
    //   INSERT INTO invoices (customer_id, amount, status, date)
    //   VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    // `;
    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/invoices', {
      method: '',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        amount: amountInCents,
        status: status,
      }),
    });

    // レスポンスをチェック
    if (res.status < 200 || res.status >= 300) {
      return {
        message: 'Error: Failed to Create Invoice.',
      };
    }
  } catch (error) {
    return { message: 'Database Error: Failed to Create Invoice.' };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    // await sql`
    //   UPDATE invoices
    //   SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    //   WHERE id = ${id}
    // `;
    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/invoices/' + id, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        amount: amountInCents,
        status: status,
      }),
    });

    // レスポンスをチェック
    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }
    if (res.status < 200 || res.status >= 300) {
      return {
        message: 'Error: Failed to Update Invoice.',
      };
    }
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');

  try {
    // await sql`DELETE FROM invoices WHERE id = ${id}`;

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();
    const res = await fetch(apiUrl + '/invoices/' + id, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // レスポンスをチェック
    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }
    if (res.status < 200 || res.status >= 300) {
      return {
        message: 'Error: Failed to Delete Invoice.',
      };
    }

    revalidatePath('/dashboard/invoices');
    return { message: 'Deleted Invoice' };
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function signUp(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const apiUrl = await getApiUrl();

    const res = await fetch(apiUrl + '/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
        name: formData.get('name'),
      }),
    });

    // レスポンスをチェック
    if (res.status === 401 || res.status === 403) {
      redirect('/sign-out');
    }
    if (res.status < 200 || res.status >= 300) {
      return 'Error: Failed to sign up.';
    }
  } catch (error) {
    return 'Error: Failed to sign up.';
  }
  redirect('/login');
}
