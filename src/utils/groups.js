import axios from 'axios';

export async function getUserGroups(token) {
  const res = await axios.get(
    'https://data-platform.cds-probono.eu/rest2hdfs/auth/groups',
    { headers: { token } }
  );
  
  return res.data?.groups || [];
}