import { createClient } from '@urql/core';
import { GetCurrentUserDocument } from '$lib/graphql/schema';

import type { Handle } from '@sveltejs/kit';
import type { Client } from '@urql/core';
import type { User } from '$lib/graphql/schema';

async function getUserDetails(
  urqlClient: Client,
  accessToken: string
): Promise<User> {
  const response = await urqlClient
    .query(
      GetCurrentUserDocument,
      {},
      {
        requestPolicy: 'network-only',
        fetchOptions: {
          headers: {
            Authorization: `JWT ${accessToken}`
          }
        }
      }
    )
    .toPromise();

  if (response?.error || response?.data?.me?.error) {
    throw new Error('Failed');
  }

  return response?.data?.me?.user;
}

export const handle: Handle = async ({ event, resolve }) => {
  try {
    const accessToken = event.cookies.get('accessToken');

    if (!accessToken) {
      return await resolve(event);
    }

    const urqlClient = createClient({
      url: import.meta.env.VITE_LINX_GRAPHQL_URL
    });
    const userDetials = await getUserDetails(urqlClient, accessToken);

    if (userDetials && accessToken) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event.locals as any).accessToken = accessToken;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event.locals as any).user = userDetials;
    }

    return await resolve(event);
  } catch (err) {
    console.log(err);
    event.locals.user = null;
    event.locals.accessToken = null;

    return await resolve(event);
  }
};
