import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';
import { api } from '../../api/axios';
import type { Document } from '../../types';
import { ROUTES } from '../../utils/constants';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from '../../utils/constants';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  file: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, 'Select one PDF file')
    .refine((files) => files?.[0]?.type === 'application/pdf', 'Only PDF is allowed')
    .refine((files) => (files?.[0]?.size ?? 0) <= MAX_FILE_SIZE_BYTES, `Max size ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`),
});

type FormData = z.infer<typeof schema>;

export function UploadDocument() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    const file = data.file[0];
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('file', file);
    try {
      await api.post<Document>('/api/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed';
      setSubmitError(msg);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Upload PDF</h1>
        <p className="mt-1 text-sm font-semibold text-slate-900">Add a new document to sign</p>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-xl p-6 bg-white shadow-lg border-2 border-slate-400"
      >
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {submitError}
          </div>
        )}
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-slate-900">
            Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Contract 2024"
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            {...register('title')}
          />
          {errors.title && (
            <p className="mt-1.5 text-sm font-medium text-red-600">{errors.title.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="file" className="mb-1.5 block text-sm font-semibold text-slate-900">
            PDF file
          </label>
          <input
            id="file"
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(',')}
            className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-semibold file:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            {...register('file')}
          />
          {errors.file && (
            <p className="mt-1.5 text-sm font-medium text-red-600">{errors.file.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold disabled:opacity-60"
        >
          <Upload className="h-5 w-5" />
          {isSubmitting ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
