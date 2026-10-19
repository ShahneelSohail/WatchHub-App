'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { AddressForm } from '@/components/AddressForm';
import { useAuth, useToast } from '@/components/Providers';
import { RequireAuth } from '@/components/RequireAuth';
import { Badge, Button, Card, ErrorState, Field, Input, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import type { Address, User } from '@/lib/types';

const ProfileCard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const save = useMutation({
    mutationFn: (body: object) => api.patch<User>('/auth/me', body),
    onSuccess: updated => {
      queryClient.setQueryData(['me'], updated);
      toast('success', 'Profile updated.');
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  };

  return (
    <Card>
      <h2 className="mb-4 font-serif text-xl">Profile</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input name="name" defaultValue={user?.name} required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" defaultValue={user?.email} required />
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={user?.phone ?? ''} />
        </Field>
        {save.isError && <ErrorState message={save.error.message} />}
        <Button type="submit" disabled={save.isPending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
};

const PasswordCard = () => {
  const toast = useToast();
  const change = useMutation({
    mutationFn: (body: object) => api.post('/auth/change-password', body),
    onSuccess: () => toast('success', 'Password changed.'),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    change.mutate(Object.fromEntries(new FormData(form)), { onSuccess: () => form.reset() });
  };

  return (
    <Card>
      <h2 className="mb-4 font-serif text-xl">Change password</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <Field label="New password (8+ characters)">
          <Input name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        {change.isError && <ErrorState message={change.error.message} />}
        <Button type="submit" disabled={change.isPending}>
          Update password
        </Button>
      </form>
    </Card>
  );
};

const AddressesCard = () => {
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api.get<Address[]>('/addresses') });
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const store = (saved: Address[]) => queryClient.setQueryData(['addresses'], saved);
  const remove = useMutation({ mutationFn: (id: number) => api.delete<Address[]>(`/addresses/${id}`), onSuccess: store });

  return (
    <Card className="lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl">Delivery addresses</h2>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing('new')}>
            Add address
          </Button>
        )}
      </div>
      {editing ? (
        <AddressForm
          initial={editing === 'new' ? undefined : editing}
          submitLabel="Save address"
          onCancel={() => setEditing(null)}
          onSubmit={async address => {
            store(editing === 'new' ? await api.post<Address[]>('/addresses', address) : await api.put<Address[]>(`/addresses/${editing.id}`, address));
            setEditing(null);
          }}
        />
      ) : addresses.isPending ? (
        <Spinner />
      ) : addresses.data?.length === 0 ? (
        <p className="text-sm text-muted">You have not saved an address yet.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.data?.map(address => (
            <li key={address.id} className="rounded-xl border border-line p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                {address.recipient} {address.isDefault && <Badge value="PUBLISHED" label="Default" />}
              </p>
              <p className="mt-1 text-muted">
                {address.addressLine}, {address.city}, {address.state} {address.zip}, {address.country}
              </p>
              <div className="mt-3 flex gap-3">
                <Button variant="ghost" className="px-0 py-0" onClick={() => setEditing(address)}>
                  Edit
                </Button>
                <Button variant="ghost" className="px-0 py-0" onClick={() => remove.mutate(address.id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default function AccountPage() {
  return (
    <RequireAuth>
      <PageHeading eyebrow="Your account" title="Account settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
        <AddressesCard />
      </div>
    </RequireAuth>
  );
}
