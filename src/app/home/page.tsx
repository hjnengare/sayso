import HomeClient from './HomeClient';
import GuestHome from './GuestHome';

type SearchParams = Record<string, string | string[] | undefined>;

export default function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const guestParam = searchParams?.guest;
  const isGuest =
    guestParam === 'true' ||
    (Array.isArray(guestParam) && guestParam.includes('true'));

  return isGuest ? <GuestHome /> : <HomeClient />;
}

