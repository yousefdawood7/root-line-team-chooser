'use client';

import { useState, useRef, type DragEvent } from 'react';
import { FileSpreadsheet, CheckCircle, AlertCircle, Loader2, TableProperties, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ColumnMapping } from '@/lib/types';

interface ExcelUploaderProps {
  onUploadSuccess: (data: unknown) => void;
}

interface PreviewData {
  filename: string;
  defaultTitle: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
  suggestedMapping: ColumnMapping;
}

export function ExcelUploader({ onUploadSuccess }: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // User Chosen Mapping & Session Title
  const [sessionTitle, setSessionTitle] = useState('');
  const [titleCol, setTitleCol] = useState('');
  const [roleCol, setRoleCol] = useState('');
  const [departmentCol, setDepartmentCol] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [phoneCol, setPhoneCol] = useState('');
  const [experienceCol, setExperienceCol] = useState('');
  const [skillsCol, setSkillsCol] = useState('');
  const [notesCol, setNotesCol] = useState('');

  const handleFileSelect = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.');
      return;
    }

    try {
      setPreviewLoading(true);
      setError(null);
      setSuccessMsg(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect spreadsheet');
      }

      setPendingFile(file);
      setPreviewData(data);
      setSessionTitle(data.defaultTitle || `Rootline Draft - ${new Date().toISOString().slice(0, 10)}`);

      // Set initial suggested mapping
      setTitleCol(data.suggestedMapping?.titleCol || (data.headers && data.headers[0]) || '');
      setRoleCol(data.suggestedMapping?.roleCol || '');
      setDepartmentCol(data.suggestedMapping?.departmentCol || '');
      setEmailCol(data.suggestedMapping?.emailCol || '');
      setPhoneCol(data.suggestedMapping?.phoneCol || '');
      setExperienceCol(data.suggestedMapping?.experienceCol || '');
      setSkillsCol(data.suggestedMapping?.skillsCol || '');
      setNotesCol(data.suggestedMapping?.notesCol || '');

      setIsConfigOpen(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reading file');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingFile) return;
    if (!titleCol) {
      setError('Please select a column to use as the Candidate Title / Name.');
      return;
    }

    try {
      setImportLoading(true);
      setError(null);

      const mapping: ColumnMapping = {
        titleCol,
        roleCol: roleCol || undefined,
        departmentCol: departmentCol || undefined,
        emailCol: emailCol || undefined,
        phoneCol: phoneCol || undefined,
        experienceCol: experienceCol || undefined,
        skillsCol: skillsCol || undefined,
        notesCol: notesCol || undefined,
      };

      const formData = new FormData();
      formData.append('file', pendingFile);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('sessionTitle', sessionTitle.trim());

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import candidates');
      }

      setSuccessMsg(`Successfully imported ${data.count} candidates using column "${titleCol}" as card title.`);
      setIsConfigOpen(false);
      onUploadSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error importing file');
    } finally {
      setImportLoading(false);
    }
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-zinc-900 bg-zinc-50'
            : 'border-zinc-200 hover:border-zinc-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center gap-2.5">
          <div className="h-10 w-10 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
            {previewLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-5 h-5" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900">
              {previewLoading ? 'Inspecting Spreadsheet Columns...' : 'Upload Candidates Spreadsheet'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Drag and drop your .xlsx, .xls, or .csv file here to choose columns and import
            </p>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px] font-mono">.XLSX</Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">.XLS</Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">.CSV</Badge>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mt-3 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Column Mapping & Ingestion Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl bg-white border-zinc-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <TableProperties className="w-4 h-4" />
              Configure Spreadsheet Import & Column Mapping
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Choose which spreadsheet columns map to candidate card attributes. Found {previewData?.totalRows || 0} candidate rows in {previewData?.filename}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Draft Session Title */}
            <div className="space-y-1 p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
              <label className="text-xs font-semibold text-zinc-900 block">
                Draft Session Title
              </label>
              <Input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Rootline Draft - 2026-10-27"
                className="bg-white text-xs h-8"
              />
              <p className="text-[11px] text-zinc-400">
                This title will be displayed on the draft board and reports.
              </p>
            </div>

            {/* Primary Card Title Selector */}
            <div className="p-3.5 rounded-lg border border-zinc-900 bg-zinc-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                  Candidate Title / Name Column <span className="text-red-500">*</span>
                </label>
                <Badge variant="default" className="text-[10px]">
                  Card Main Title
                </Badge>
              </div>
              <select
                value={titleCol}
                onChange={(e) => setTitleCol(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-zinc-300 bg-white text-xs font-semibold text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
              >
                <option value="">-- Choose Column for Card Title --</option>
                {previewData?.headers.map((h) => (
                  <option key={h} value={h}>
                    Column: {h}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-600">
                Select your <strong>Name</strong>, <strong>Full Name</strong>, or <strong>Email</strong> column. Choosing this avoids displaying Google Forms timestamps as card titles.
              </p>
            </div>

            {/* Other Mappings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 block">
                  Role / Track Column
                </label>
                <select
                  value={roleCol}
                  onChange={(e) => setRoleCol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">(None / Auto-detect)</option>
                  {previewData?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 block">
                  Department Column
                </label>
                <select
                  value={departmentCol}
                  onChange={(e) => setDepartmentCol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">(None / Auto-detect)</option>
                  {previewData?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 block">
                  Email Address Column
                </label>
                <select
                  value={emailCol}
                  onChange={(e) => setEmailCol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">(None / Auto-detect)</option>
                  {previewData?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 block">
                  Phone Number Column
                </label>
                <select
                  value={phoneCol}
                  onChange={(e) => setPhoneCol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">(None / Auto-detect)</option>
                  {previewData?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 block">
                  Experience Column
                </label>
                <select
                  value={experienceCol}
                  onChange={(e) => setExperienceCol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">(None / Auto-detect)</option>
                  {previewData?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700 block">
                  Skills / Tech Stack Column
                </label>
                <select
                  value={skillsCol}
                  onChange={(e) => setSkillsCol(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-md border border-zinc-200 bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="">(None / Auto-detect)</option>
                  {previewData?.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live 3-Row Preview Table */}
            {previewData?.previewRows && previewData.previewRows.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-semibold text-zinc-700">
                  Sample Data Preview (First {previewData.previewRows.length} Rows)
                </p>
                <div className="border border-zinc-200 rounded-md overflow-x-auto max-h-36">
                  <table className="w-full text-[11px] border-collapse text-left">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-200 font-semibold text-zinc-700">
                        {previewData.headers.slice(0, 5).map((h) => (
                          <th key={h} className="p-2 whitespace-nowrap">
                            {h} {h === titleCol && <span className="text-emerald-600">(Title)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {previewData.previewRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50">
                          {previewData.headers.slice(0, 5).map((h) => (
                            <td key={h} className="p-2 truncate max-w-[140px]">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfigOpen(false)}
              disabled={importLoading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={importLoading || !titleCol}
            >
              {importLoading ? 'Importing Candidates...' : 'Confirm & Ingest Candidates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
