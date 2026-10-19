import { ProductForm } from '@/components/admin/ProductForm';
import { PageHeading } from '@/components/ui';

export default function NewProductPage() {
  return (
    <>
      <PageHeading eyebrow="Catalogue" title="Add product" />
      <ProductForm />
    </>
  );
}
