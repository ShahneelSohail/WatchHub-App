import { redirect } from 'next/navigation';

export default async function AdminTicketRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/admin/tickets?id=${(await params).id}`);
}
