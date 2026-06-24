import { axiosClientWithoutToken } from './config';

export async function confirmParentalClaim(token: string) {
  return axiosClientWithoutToken.get('/api/v1/parental-claim', {
    params: { token },
  });
}
