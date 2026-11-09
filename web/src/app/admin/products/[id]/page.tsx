'use client';

import { useParams } from 'next/navigation';
import { ProductEditor } from '@/components/admin/ProductEditor';

export default function EditProductPage() {
  return <ProductEditor id={Number(useParams<{ id: string }>().id)} />;
}
