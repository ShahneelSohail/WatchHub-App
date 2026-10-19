'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { uploadImages } from '@/lib/uploads';
import { useToast } from '../Providers';
import { Button, EmptyState, ErrorState, Field, Input, Modal, Select, Spinner, Textarea, DataTable } from '../ui';

export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'datetime' | 'image';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}

export interface ColumnConfig<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

type Values = Record<string, string | boolean>;

interface Props<T extends { id: number }> {
  title: string;
  singular: string;
  path: string;
  fields: FieldConfig[];
  columns: ColumnConfig<T>[];
  defaults: Values;
}

const toFormValue = (field: FieldConfig, raw: unknown): string | boolean => {
  if (field.type === 'checkbox') return Boolean(raw);
  if (raw === null || raw === undefined) return '';
  return field.type === 'datetime' ? String(raw).slice(0, 16) : String(raw);
};

const ImageField = ({ value, onChange }: { value: string; onChange: (url: string) => void }) => {
  const toast = useToast();
  const upload = useMutation({ mutationFn: (files: FileList) => uploadImages(files), onSuccess: ([url]) => url && onChange(url), onError: (error: Error) => toast('error', error.message) });
  return (
    <div className="flex items-center gap-4">
      {value && (
        <img src={value} alt="" className="h-16 w-16 rounded-xl border border-line bg-sand object-contain p-1" />
      )}
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => event.target.files?.length && upload.mutate(event.target.files)} className="text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-sand file:px-4 file:py-2 file:text-sm file:font-medium" />
    </div>
  );
};

const FieldInput = ({ field, value, onChange }: { field: FieldConfig; value: string | boolean; onChange: (value: string | boolean) => void }) => {
  if (field.type === 'checkbox')
    return (
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-navy" />
        {field.label}
      </label>
    );

  const text = String(value);
  return (
    <Field label={field.label} hint={field.hint}>
      {field.type === 'textarea' ? (
        <Textarea value={text} onChange={event => onChange(event.target.value)} required={field.required} />
      ) : field.type === 'select' ? (
        <Select value={text} onChange={event => onChange(event.target.value)} required={field.required}>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : field.type === 'image' ? (
        <ImageField value={text} onChange={onChange} />
      ) : (
        <Input type={field.type === 'datetime' ? 'datetime-local' : field.type} step={field.type === 'number' ? 'any' : undefined} value={text} onChange={event => onChange(event.target.value)} required={field.required} />
      )}
    </Field>
  );
};

export const ResourceManager = <T extends { id: number }>({ title, singular, path, fields, columns, defaults }: Props<T>) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = ['admin', path];
  const rows = useQuery({ queryKey: key, queryFn: () => api.get<T[]>(path) });
  const [editing, setEditing] = useState<{ row: T | null; values: Values } | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const save = useMutation({
    mutationFn: (values: Values) => (editing?.row ? api.put(`${path}/${editing.row.id}`, values) : api.post(path, values)),
    onSuccess: () => {
      refresh();
      toast('success', `${singular} saved.`);
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`${path}/${id}`),
    onSuccess: () => {
      refresh();
      toast('success', `${singular} deleted.`);
    },
    onError: (error: Error) => toast('error', error.message),
  });

  const open = (row: T | null) =>
    setEditing({ row, values: row ? Object.fromEntries(fields.map(field => [field.name, toFormValue(field, (row as Record<string, unknown>)[field.name])])) : defaults });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(editing!.values);
  };

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">{title}</h2>
        <Button onClick={() => open(null)}>Add {singular.toLowerCase()}</Button>
      </div>
      {rows.isPending ? (
        <Spinner />
      ) : rows.data?.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} />
      ) : (
        <DataTable headers={[...columns.map(column => column.header), '']}>
          {rows.data?.map(row => (
            <tr key={row.id}>
              {columns.map(column => (
                <td key={column.header}>{column.cell(row)}</td>
              ))}
              <td className="text-right whitespace-nowrap">
                <Button variant="ghost" className="px-3 py-1" onClick={() => open(row)}>
                  Edit
                </Button>
                <Button variant="ghost" className="px-3 py-1 hover:text-red-700" onClick={() => window.confirm(`Delete this ${singular.toLowerCase()}?`) && remove.mutate(row.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {editing && (
        <Modal title={`${editing.row ? 'Edit' : 'Add'} ${singular.toLowerCase()}`} onClose={() => setEditing(null)}>
          <form onSubmit={submit} className="space-y-4">
            {fields.map(field => (
              <FieldInput key={field.name} field={field} value={editing.values[field.name] ?? ''} onChange={value => setEditing({ ...editing, values: { ...editing.values, [field.name]: value } })} />
            ))}
            {save.isError && <ErrorState message={save.error.message} />}
            <div className="flex gap-3">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
