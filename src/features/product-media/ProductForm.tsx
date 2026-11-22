'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { productService } from '@/services/productService';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ROUTES, PRODUCT_UNITS, KONKAN_DISTRICTS, INDIAN_STATES } from '@/lib/constants';
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '@/models/product';

const schema = z.object({
  name: z.string().min(2, 'Product name is required'),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(10, 'Please add a description (at least 10 characters)'),
  price: z.coerce.number().positive('Price must be a positive number'),
  unit: z.string().min(1, 'Please select a unit'),
  minimumOrderQuantity: z.coerce.number().int().positive().default(1),
  quantityAvailable: z.coerce.number().nonnegative('Enter a quantity of zero or more'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const catOptions = Object.entries(PRODUCT_CATEGORIES).map(([v,l]) => ({ value: v, label: l }));
const unitOptions = PRODUCT_UNITS.map(u => ({ value: u, label: u }));
const stateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));

export function ProductForm({ product }: { product?: Product }) {
  const { userProfile } = useAuth();
  const router = useRouter();
  const draftId = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: product ? {
      name: product.name, category: product.category, description: product.description,
      price: product.price, unit: product.unit, minimumOrderQuantity: product.minimumOrderQuantity,
      quantityAvailable: product.quantityAvailable, district: product.district, state: product.state,
    } : { state: 'Goa', unit: 'kg', minimumOrderQuantity: 1 },
  });

  const watchedState = useWatch({ control, name: 'state' });
  const konkanDistricts = KONKAN_DISTRICTS[watchedState];
  const districtOptions = konkanDistricts?.map(d => ({ value: d, label: d })) ?? [];

  const onSubmit = async (data: FormData) => {
    if (!userProfile) return;
    setError(null);
    try {
      const details = {
        ...data, category: data.category as ProductCategory,
        farmerDistrict: data.district, farmerState: data.state,
      };
      if (product) {
        await productService.update(product.productId, details);
      } else {
        draftId.current ??= crypto.randomUUID();
        await productService.create({
          ...details, farmerId: userProfile.uid, farmerUserId: userProfile.uid,
          farmerName: userProfile.name, images: [],
        }, draftId.current);
      }
      router.push(ROUTES.FARMER_PRODUCTS);
    } catch {
      setError(product ? 'Failed to update product. Please try again.' : 'Failed to list product. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">{product ? 'Edit Product' : 'List a Product'}</h1>
        <p className="text-sm text-neutral-500 mt-1">Product listings can be saved without photos. Photo uploads are disabled.</p>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      <form onSubmit={event => void handleSubmit(onSubmit)(event)} className="space-y-6">
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Product Details</h2>
          <div className="space-y-4">
            <Input label="Product name" required placeholder="e.g. Organic Coconut Oil" error={errors.name?.message} {...register('name')} />
            <Select label="Category" required options={catOptions} placeholder="Select category" error={errors.category?.message} {...register('category')} />
            <Textarea label="Description" required placeholder="Describe your product: how it's grown, quality, packaging..." rows={4} error={errors.description?.message} {...register('description')} />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Pricing & Quantity</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Price (₹)" type="number" required placeholder="e.g. 150" error={errors.price?.message} {...register('price')} />
              <Select label="Unit" required options={unitOptions} error={errors.unit?.message} {...register('unit')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Available quantity" type="number" min={0} step="any" required placeholder="e.g. 100" error={errors.quantityAvailable?.message} {...register('quantityAvailable')} />
              <Input label="Minimum order" type="number" required placeholder="e.g. 1" error={errors.minimumOrderQuantity?.message} {...register('minimumOrderQuantity')} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <Select label="State" required options={stateOptions} error={errors.state?.message} {...register('state')} onChange={e => { setValue('state', e.target.value); setValue('district', ''); }} />
            {konkanDistricts ? (
              <Select label="District" required options={districtOptions} placeholder="Select district" error={errors.district?.message} {...register('district')} />
            ) : (
              <Input label="District" required error={errors.district?.message} {...register('district')} />
            )}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push(ROUTES.FARMER_PRODUCTS)}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting} leftIcon={<Package className="w-4 h-4"/>}>{product ? 'Save changes' : 'List Product'}</Button>
        </div>
      </form>
    </div>
  );
}
