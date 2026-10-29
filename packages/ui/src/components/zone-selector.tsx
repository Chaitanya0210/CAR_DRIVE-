'use client';
import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '../utils';
import { Select } from './select';

export interface ZoneSelection {
  stateId: string;
  districtId: string;
  talukaId: string;
  pincode: string;
}

export interface ZoneSelectorProps {
  initialValue?: Partial<ZoneSelection>;
  onChange?: (selection: ZoneSelection) => void;
  className?: string;
  disabled?: boolean;
}

// Sample Indian administrative zones (Maharashtra rural-first stub)
const SAMPLE_STATES = [
  { value: 'MH', label: 'Maharashtra' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'GJ', label: 'Gujarat' },
];

const SAMPLE_DISTRICTS: Record<string, { value: string; label: string }[]> = {
  MH: [
    { value: 'PUN', label: 'Pune' },
    { value: 'SAT', label: 'Satara' },
    { value: 'SOL', label: 'Solapur' },
  ],
  KA: [
    { value: 'BLR', label: 'Bengaluru Rural' },
    { value: 'BEL', label: 'Belagavi' },
  ],
  GJ: [
    { value: 'SUR', label: 'Surat' },
    { value: 'BRD', label: 'Vadodara' },
  ],
};

const SAMPLE_TALUKAS: Record<string, { value: string; label: string }[]> = {
  PUN: [
    { value: 'BAR', label: 'Baramati (Rural)' },
    { value: 'HAV', label: 'Haveli' },
    { value: 'JUN', label: 'Junnar (Rural)' },
  ],
  SAT: [
    { value: 'KRD', label: 'Karad' },
    { value: 'WAI', label: 'Wai (Rural)' },
  ],
  SOL: [
    { value: 'PDR', label: 'Pandharpur (Rural)' },
  ],
  BLR: [
    { value: 'DEW', label: 'Devanahalli' },
  ],
  BEL: [
    { value: 'CHK', label: 'Chikkodi (Rural)' },
  ],
  SUR: [
    { value: 'BRD_T', label: 'Bardoli (Rural)' },
  ],
  BRD: [
    { value: 'DAB', label: 'Dabhoi' },
  ],
};

const SAMPLE_PINCODES: Record<string, string[]> = {
  BAR: ['413102', '413133'],
  HAV: ['411028', '412207'],
  JUN: ['410502'],
  KRD: ['415110'],
  WAI: ['412803'],
  PDR: ['413304'],
  DEW: ['562110'],
  CHK: ['591201'],
  BRD_T: ['394601'],
  DAB: ['391110'],
};

export const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  initialValue,
  onChange,
  className,
  disabled = false,
}) => {
  const [stateId, setStateId] = useState(initialValue?.stateId || 'MH');
  const [districtId, setDistrictId] = useState(initialValue?.districtId || 'PUN');
  const [talukaId, setTalukaId] = useState(initialValue?.talukaId || 'BAR');
  const [pincode, setPincode] = useState(initialValue?.pincode || '413102');

  const districtOptions = SAMPLE_DISTRICTS[stateId] || [];
  const talukaOptions = SAMPLE_TALUKAS[districtId] || [];
  const pincodeOptions = (SAMPLE_PINCODES[talukaId] || ['413102']).map((p) => ({
    value: p,
    label: p,
  }));

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setStateId(newState);
    const newDist = (SAMPLE_DISTRICTS[newState]?.[0]?.value) || '';
    setDistrictId(newDist);
    const newTal = (SAMPLE_TALUKAS[newDist]?.[0]?.value) || '';
    setTalukaId(newTal);
    const newPin = (SAMPLE_PINCODES[newTal]?.[0]) || '';
    setPincode(newPin);

    onChange?.({
      stateId: newState,
      districtId: newDist,
      talukaId: newTal,
      pincode: newPin,
    });
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDist = e.target.value;
    setDistrictId(newDist);
    const newTal = (SAMPLE_TALUKAS[newDist]?.[0]?.value) || '';
    setTalukaId(newTal);
    const newPin = (SAMPLE_PINCODES[newTal]?.[0]) || '';
    setPincode(newPin);

    onChange?.({
      stateId,
      districtId: newDist,
      talukaId: newTal,
      pincode: newPin,
    });
  };

  const handleTalukaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTal = e.target.value;
    setTalukaId(newTal);
    const newPin = (SAMPLE_PINCODES[newTal]?.[0]) || '';
    setPincode(newPin);

    onChange?.({
      stateId,
      districtId,
      talukaId: newTal,
      pincode: newPin,
    });
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPin = e.target.value;
    setPincode(newPin);
    onChange?.({
      stateId,
      districtId,
      talukaId,
      pincode: newPin,
    });
  };

  return (
    <div className={cn('p-4 rounded-xl border border-border bg-surface shadow-sm space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 border-b border-border pb-2.5">
        <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <span>Delivery Zone Hierarchy (Rural-First)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Select
          label="State"
          disabled={disabled}
          value={stateId}
          onChange={handleStateChange}
          options={SAMPLE_STATES}
        />
        <Select
          label="District"
          disabled={disabled || districtOptions.length === 0}
          value={districtId}
          onChange={handleDistrictChange}
          options={districtOptions}
        />
        <Select
          label="Taluka / Tehsil"
          disabled={disabled || talukaOptions.length === 0}
          value={talukaId}
          onChange={handleTalukaChange}
          options={talukaOptions}
        />
        <Select
          label="Pincode"
          disabled={disabled || pincodeOptions.length === 0}
          value={pincode}
          onChange={handlePincodeChange}
          options={pincodeOptions}
        />
      </div>
    </div>
  );
};
