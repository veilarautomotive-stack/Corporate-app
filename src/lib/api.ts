
export async function rpc(procedure: string, args: any) {
  const response = await fetch(`/api/rpc/${procedure}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'RPC failed');
  }
  return response.json();
}

export async function getView(viewName: string) {
  const response = await fetch(`/api/views/${viewName}`);
  if (!response.ok) {
    throw new Error('Failed to fetch view');
  }
  return response.json();
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
