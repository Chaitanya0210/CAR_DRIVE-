'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  OTPInput,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  VerifiedBadge,
  Modal,
  useToast,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
  ProgressBar,
  StepTracker,
  ZoneSelector,
  QuoteComparisonTable,
  OfferCard,
  EmptyState,
  Skeleton,
} from '@groupdrive/ui';
import {
  Car,
  Type,
} from 'lucide-react';

export default function DesignSystemPage() {
  const { toast } = useToast();

  // State for interactive component demos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [selectedZone, setSelectedZone] = useState<{
    stateId: string;
    districtId: string;
    talukaId: string;
    pincode: string;
  }>({
    stateId: 'MH',
    districtId: 'PUN',
    talukaId: 'BAR',
    pincode: '413102',
  });

  const toggleLargeText = () => {
    const next = !largeTextMode;
    setLargeTextMode(next);
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('large-text', next);
    }
  };

  const handleVoteQuote = (id: string) => {
    toast({
      type: 'success',
      title: 'Vote Cast Successfully',
      description: `Your vote for quote ${id} has been recorded on the group ledger.`,
    });
  };

  const handleBookVehicle = (id: string) => {
    toast({
      type: 'info',
      title: 'Hold Token Initiated',
      description: `Reserving offered clearance vehicle ${id} for delivery to Baramati.`,
    });
  };

  return (
    <div className="min-h-screen bg-surface text-neutral-900 pb-24">
      {/* Top Banner / Utility Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border py-3 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-sm">
              GD
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900 leading-tight">
                GroupDrive Design System
              </h1>
              <p className="text-xs text-neutral-500">
                Light Mode • WCAG 2.2 AA • 44px Touch Targets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={largeTextMode ? 'primary' : 'outline'}
              size="sm"
              onClick={toggleLargeText}
              aria-pressed={largeTextMode}
              className="gap-1.5"
            >
              <Type className="w-4 h-4" aria-hidden="true" />
              <span>{largeTextMode ? 'Large Text: ON' : 'Large Text: OFF'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-12">
        {/* Section 0: Brand Color Tokens & Typography */}
        <section aria-labelledby="tokens-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="tokens-heading" className="text-xl font-bold text-neutral-900">
              1. Brand Palette & Semantic Tokens
            </h2>
            <p className="text-xs text-neutral-500">
              Strictly non-reliant: Brand red is isolated from error status (distinct deep crimson #881337).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl border border-border bg-surface shadow-sm">
              <div className="h-10 rounded-lg bg-primary mb-2 shadow-inner" />
              <div className="text-xs font-bold">Primary Brand</div>
              <div className="text-[11px] text-neutral-500">#DC2626 (Red 600)</div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface shadow-sm">
              <div className="h-10 rounded-lg bg-success mb-2 shadow-inner" />
              <div className="text-xs font-bold text-emerald-800">Success</div>
              <div className="text-[11px] text-neutral-500">#059669 (Emerald)</div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface shadow-sm">
              <div className="h-10 rounded-lg bg-warning mb-2 shadow-inner" />
              <div className="text-xs font-bold text-amber-800">Warning</div>
              <div className="text-[11px] text-neutral-500">#D97706 (Amber)</div>
            </div>

            <div className="p-3 rounded-xl border border-error-border bg-error-light shadow-sm">
              <div className="h-10 rounded-lg bg-error mb-2 shadow-inner" />
              <div className="text-xs font-bold text-error-dark">Error (Distinct)</div>
              <div className="text-[11px] text-error">#881337 (Burgundy)</div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface shadow-sm">
              <div className="h-10 rounded-lg bg-info mb-2 shadow-inner" />
              <div className="text-xs font-bold text-sky-800">Info</div>
              <div className="text-[11px] text-neutral-500">#0284C7 (Sky)</div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-neutral-100 shadow-sm">
              <div className="h-10 rounded-lg bg-neutral-800 mb-2 shadow-inner" />
              <div className="text-xs font-bold text-neutral-900">Neutral 800</div>
              <div className="text-[11px] text-neutral-500">#1F2937 Text</div>
            </div>
          </div>

          {/* Typography & Devanagari Specimen */}
          <div className="p-4 rounded-xl border border-border bg-surface-subtle space-y-2">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Devanagari & Multilingual Typography Specimen (Noto Sans + Noto Sans Devanagari)
            </h3>
            <div className="space-y-1">
              <p className="text-lg font-bold text-neutral-900">
                मराठी: बारामती तालुक्यासाठी कार खरेदीदार गट तयार करा आणि घाऊक दर मिळवा.
              </p>
              <p className="text-base font-medium text-neutral-800">
                हिंदी: अपनी तहसील में ग्रुप बनाएं और डीलर से सीधे घर तक गाड़ी मंगवाएं।
              </p>
              <p className="text-sm text-neutral-600">
                English: Form a buyer group in your taluka. Reverse auction triggered upon 5 buyers.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Buttons */}
        <section aria-labelledby="buttons-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="buttons-heading" className="text-xl font-bold text-neutral-900">
              2. Buttons (Min 44px Touch Target)
            </h2>
            <p className="text-xs text-neutral-500">
              Variants: Primary (Brand Red), Secondary, Outline, Danger/Error, Ghost, and Loading states.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary Action</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="danger">Danger Action</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" isLoading>
              Processing
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* Section 2: Badges & Verified Badges */}
        <section aria-labelledby="badges-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="badges-heading" className="text-xl font-bold text-neutral-900">
              3. Badges & Verified Badges
            </h2>
            <p className="text-xs text-neutral-500">
              Includes VerifiedBadge with official dealership verification mark.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <VerifiedBadge label="Verified Dealer (KYB Approved)" />
            <VerifiedBadge variant="buyer" label="Verified Buyer" />
            <Badge variant="primary">Active RFQ</Badge>
            <Badge variant="success">Quorum Hit</Badge>
            <Badge variant="warning">Awaiting 1 Buyer</Badge>
            <Badge variant="error">Sealed Window Closed</Badge>
            <Badge variant="info">In Transit to Taluka</Badge>
            <Badge variant="neutral">Draft Group</Badge>
          </div>
        </section>

        {/* Section 3: Cards */}
        <section aria-labelledby="cards-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="cards-heading" className="text-xl font-bold text-neutral-900">
              4. Card Components
            </h2>
            <p className="text-xs text-neutral-500">
              Accessible surface containers with header, description, content, and action footers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Maruti Swift Baramati Cohort</CardTitle>
                <CardDescription>Target Zone: Baramati, Pune (413102)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600">
                  4 out of 5 local verified buyers joined. Join now to trigger the sealed reverse auction across all certified dealers in Maharashtra.
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="success">1 Buyer Needed</Badge>
                <Button size="sm">Join Group</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tata Nexon Karad Cohort</CardTitle>
                <CardDescription>Target Zone: Karad, Satara (415110)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600">
                  Quorum reached! Reverse auction is currently active with 3 sealed dealer bids submitted.
                </p>
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="primary">Bidding Active</Badge>
                <Button size="sm" variant="outline">View RFQ Room</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Section 4: Form Controls (Input, OTPInput, Select) */}
        <section aria-labelledby="forms-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="forms-heading" className="text-xl font-bold text-neutral-900">
              5. Form Controls & Deep-Crimson Error States
            </h2>
            <p className="text-xs text-neutral-500">
              Errors use a dedicated deep-crimson token (#881337) with alert icon + text for accessibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Buyer Mobile Number"
              placeholder="e.g. 9822012345"
              helperText="Phone OTP is your primary credentials."
              required
            />

            <Input
              label="GSTIN (Dealers)"
              defaultValue="27AAAAA0000A1Z5"
              error="GSTIN checksum verification failed"
              required
            />

            <Select
              label="Vehicle Fuel Preference"
              options={[
                { value: 'PETROL', label: 'Petrol' },
                { value: 'DIESEL', label: 'Diesel' },
                { value: 'CNG', label: 'CNG Factory Fitted' },
                { value: 'ELECTRIC', label: 'Electric Vehicle (EV)' },
              ]}
              helperText="Determines RTO calculation bracket."
            />
          </div>

          {/* Interactive OTP Input Box */}
          <div className="p-5 rounded-2xl border border-border bg-surface-subtle max-w-md mx-auto space-y-3 text-center">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-900">
                Phone OTP Verification (6 Digits)
              </h3>
              <p className="text-xs text-neutral-500">
                Try entering digits or pasting a 6-digit code.
              </p>
            </div>

            <OTPInput
              length={6}
              value={otpValue}
              onChange={(val) => {
                setOtpValue(val);
                if (otpError) setOtpError('');
              }}
              onComplete={(code) => {
                if (code !== '123456') {
                  setOtpError('Invalid OTP. Use demo code 123456.');
                } else {
                  setOtpError('');
                  toast({
                    type: 'success',
                    title: 'Phone Verified!',
                    description: 'Buyer login credentials validated.',
                  });
                }
              }}
              error={otpError}
            />

            <div className="flex items-center justify-between text-xs text-neutral-500 pt-2">
              <span>Code: {otpValue || '------'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtpValue('123456');
                  setOtpError('');
                }}
              >
                Autofill Demo Code (123456)
              </Button>
            </div>
          </div>
        </section>

        {/* Section 4: Progress Bar & Step Tracker */}
        <section aria-labelledby="progress-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="progress-heading" className="text-xl font-bold text-neutral-900">
              5. Quorum Progress & Delivery Step Tracker
            </h2>
            <p className="text-xs text-neutral-500">
              Aria-compliant indicators for group formation and end-to-end delivery milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
              <h3 className="text-sm font-semibold text-neutral-700">Group Quorum Progress</h3>
              <ProgressBar current={4} total={5} label="Swift Baramati Group Demand" />
            </div>

            <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
              <h3 className="text-sm font-semibold text-neutral-700">Completed Quorum (RFQ Triggered)</h3>
              <ProgressBar current={5} total={5} label="Tata Nexon Karad Group" />
            </div>
          </div>

          {/* Delivery Milestone Tracker */}
          <div className="p-5 rounded-2xl border border-border bg-surface">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">
              Order Fulfillment Lifecycle
            </h3>
            <StepTracker
              steps={[
                { id: '1', title: 'Group Formed', description: '5/5 buyers' },
                { id: '2', title: 'Reverse Auction', description: 'Sealed bids' },
                { id: '3', title: 'Winner Voted', description: 'Lowest landed' },
                { id: '4', title: 'Deal Locked', description: 'Hold token' },
                { id: '5', title: 'In Transit', description: 'Zone dispatch' },
                { id: '6', title: 'Delivered', description: 'Doorstep RTO' },
              ]}
              currentStepIndex={3}
            />
          </div>
        </section>

        {/* Section 5: Zone Selector (Rural-First Stub) */}
        <section aria-labelledby="zone-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="zone-heading" className="text-xl font-bold text-neutral-900">
              6. Cascading Zone Hierarchy (Rural-First)
            </h2>
            <p className="text-xs text-neutral-500">
              State &gt; District &gt; Taluka &gt; Village/Pincode.
            </p>
          </div>

          <ZoneSelector
            initialValue={selectedZone}
            onChange={(sel) => setSelectedZone(sel)}
          />

          <div className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-border">
            Selected Delivery Target: <strong>{selectedZone.stateId}</strong> &gt;{' '}
            <strong>{selectedZone.districtId}</strong> &gt;{' '}
            <strong>{selectedZone.talukaId}</strong> (Pincode: {selectedZone.pincode})
          </div>
        </section>

        {/* Section 6: Normalized Quote Comparison Table */}
        <section aria-labelledby="quotes-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="quotes-heading" className="text-xl font-bold text-neutral-900">
              7. Normalized Landed Cost Comparison Table
            </h2>
            <p className="text-xs text-neutral-500">
              Landed cost at the buyer&apos;s zone is the ONLY basis for comparison.
            </p>
          </div>

          <QuoteComparisonTable
            onVoteQuote={handleVoteQuote}
            quotes={[
              {
                quoteId: 'q-101',
                dealerName: 'Sai Service Autocity',
                isVerified: true,
                dealerLocation: 'Pune East Hub',
                deliveryDays: 4,
                userVoted: true,
                breakdown: {
                  exShowroomPaise: 87500000,
                  roadTaxRtoPaise: 9625000,
                  insuranceEstimatePaise: 3800000,
                  fastagRegistrationCessPaise: 250000,
                  dealerLogisticsToZonePaise: 1200000,
                  tcsPaise: 0,
                  batchGroupDiscountPaise: 5000000,
                  totalLandedCostPaise: 97375000,
                },
              },
              {
                quoteId: 'q-102',
                dealerName: 'Kothari Auto Link',
                isVerified: true,
                dealerLocation: 'Solapur Highway Hub',
                deliveryDays: 6,
                breakdown: {
                  exShowroomPaise: 87500000,
                  roadTaxRtoPaise: 9625000,
                  insuranceEstimatePaise: 3800000,
                  fastagRegistrationCessPaise: 250000,
                  dealerLogisticsToZonePaise: 1800000,
                  tcsPaise: 0,
                  batchGroupDiscountPaise: 4000000,
                  totalLandedCostPaise: 98975000,
                },
              },
              {
                quoteId: 'q-103',
                dealerName: 'Bhandari Motors Direct',
                isVerified: false,
                dealerLocation: 'Satara District Hub',
                deliveryDays: 7,
                breakdown: {
                  exShowroomPaise: 87500000,
                  roadTaxRtoPaise: 9625000,
                  insuranceEstimatePaise: 3800000,
                  fastagRegistrationCessPaise: 250000,
                  dealerLogisticsToZonePaise: 2200000,
                  tcsPaise: 0,
                  batchGroupDiscountPaise: 3500000,
                  totalLandedCostPaise: 99875000,
                },
              },
            ]}
          />
        </section>

        {/* Section 7: Offered Vehicles Cards */}
        <section aria-labelledby="offers-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="offers-heading" className="text-xl font-bold text-neutral-900">
              8. Offered Vehicles (Clearance & Demo Stock)
            </h2>
            <p className="text-xs text-neutral-500">
              Secondary marketplace product for heavily discounted inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <OfferCard
              id="ov-1"
              vehicleName="Maruti Suzuki Brezza"
              variantDetails="ZXi Plus Dual Tone • Petrol 1.5L"
              manufactureYear={2025}
              conditionType="CLEARANCE"
              regularPricePaise={125000000}
              discountedPricePaise={111000000}
              imageUrl="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80"
              dealerName="Sai Service Pune"
              dealerLocation="Pune Hub"
              eligibleStates={['Maharashtra', 'Goa']}
              onBookNow={handleBookVehicle}
            />

            <OfferCard
              id="ov-2"
              vehicleName="Tata Nexon EV"
              variantDetails="Empowered Plus LR • Electric 40.5kWh"
              manufactureYear={2024}
              conditionType="DEMO"
              odometerKm={1850}
              regularPricePaise={195000000}
              discountedPricePaise={169000000}
              imageUrl="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80"
              dealerName="National Auto World"
              dealerLocation="Satara Hub"
              eligibleStates={['Maharashtra', 'Karnataka']}
              onBookNow={handleBookVehicle}
            />

            <OfferCard
              id="ov-3"
              vehicleName="Hyundai Creta"
              variantDetails="SX (O) IVT • 1.5L MPi Petrol"
              manufactureYear={2024}
              conditionType="PREVIOUS_YEAR"
              odometerKm={120}
              regularPricePaise={188000000}
              discountedPricePaise={172000000}
              imageUrl="https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=600&q=80"
              dealerName="Kothari Motor Corp"
              dealerLocation="Kolhapur Hub"
              eligibleStates={['Maharashtra']}
              onBookNow={handleBookVehicle}
            />
          </div>
        </section>

        {/* Section 8: Interactive Modal & Toasts */}
        <section aria-labelledby="overlays-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="overlays-heading" className="text-xl font-bold text-neutral-900">
              9. Modals & Accessible Toasts
            </h2>
            <p className="text-xs text-neutral-500">
              Accessible dialogs with focus trapping and screen-reader status announcements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Open Join Group Modal
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                toast({
                  type: 'success',
                  title: 'Quorum Reached',
                  description: 'Reverse auction has been triggered for 5 buyers.',
                })
              }
            >
              Trigger Success Toast
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                toast({
                  type: 'warning',
                  title: 'Auction Deadline Near',
                  description: '2 hours remaining for sealed quote submissions.',
                })
              }
            >
              Trigger Warning Toast
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                toast({
                  type: 'error',
                  title: 'Dealer KYB Rejected',
                  description: 'Trade license expiration date is invalid.',
                })
              }
            >
              Trigger Error Toast (Deep Crimson)
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                toast({
                  type: 'info',
                  title: 'Zone Transit Recalculated',
                  description: 'Distance to Baramati Taluka: 74 km.',
                })
              }
            >
              Trigger Info Toast
            </Button>
          </div>

          {/* Modal Instance */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Join Baramati Swift Buyer Group"
            description="Pledge ₹5,000 hold token to join 4 other verified buyers in your taluka."
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setIsModalOpen(false);
                    toast({
                      type: 'success',
                      title: 'Joined Group!',
                      description: 'You are buyer 5 of 5. Reverse auction is now unlocked!',
                    });
                  }}
                >
                  Confirm & Reserve
                </Button>
              </>
            }
          >
            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 rounded-lg bg-neutral-50 border border-border flex items-center justify-between">
                <span>Selected Taluka:</span>
                <strong className="text-neutral-900">Baramati, Pune</strong>
              </div>
              <div className="p-3 rounded-lg bg-neutral-50 border border-border flex items-center justify-between">
                <span>Target Variant:</span>
                <strong className="text-neutral-900">Maruti Swift ZXi AMT</strong>
              </div>
              <p className="text-xs text-neutral-500">
                By joining, you agree to review sealed reverse auction quotes once the window closes.
              </p>
            </div>
          </Modal>
        </section>

        {/* Section 9: Tabs */}
        <section aria-labelledby="tabs-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="tabs-heading" className="text-xl font-bold text-neutral-900">
              10. Accessible Tabs
            </h2>
            <p className="text-xs text-neutral-500">
              Keyboard accessible tablist, tab triggers, and panels.
            </p>
          </div>

          <Tabs defaultValue="active-groups">
            <TabList>
              <TabTrigger value="active-groups">Active Groups</TabTrigger>
              <TabTrigger value="offered-stock">Offered Stock</TabTrigger>
              <TabTrigger value="past-deals">Past Delivered Deals</TabTrigger>
            </TabList>

            <TabContent value="active-groups">
              <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                <h3 className="font-bold text-sm text-neutral-900">Live Taluka Groups</h3>
                <p className="text-xs text-neutral-500">
                  Showing 3 active groups within 50 km of Baramati Taluka.
                </p>
              </div>
            </TabContent>

            <TabContent value="offered-stock">
              <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                <h3 className="font-bold text-sm text-neutral-900">Immediate Delivery Stock</h3>
                <p className="text-xs text-neutral-500">
                  Showing 12 clearance and demo cars ready for transit.
                </p>
              </div>
            </TabContent>

            <TabContent value="past-deals">
              <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                <h3 className="font-bold text-sm text-neutral-900">Closed Batch Deals</h3>
                <p className="text-xs text-neutral-500">
                  34 vehicles successfully registered and delivered across Pune & Satara.
                </p>
              </div>
            </TabContent>
          </Tabs>
        </section>

        {/* Section 10: Empty State & Skeletons */}
        <section aria-labelledby="empty-heading" className="space-y-4">
          <div className="border-b border-border pb-2">
            <h2 id="empty-heading" className="text-xl font-bold text-neutral-900">
              11. Empty States & Skeletons
            </h2>
            <p className="text-xs text-neutral-500">
              Accessible placeholder and empty state patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              icon={Car}
              title="No Groups in Wai Taluka Yet"
              description="Be the community leader! Start a buyer group for Wai and invite local neighbors to unlock bulk dealership discounts."
              actionLabel="Start Group in Wai"
              onAction={() =>
                toast({
                  type: 'info',
                  title: 'Group Wizard',
                  description: 'Starting group creator for Wai taluka.',
                })
              }
            />

            <div className="p-6 rounded-2xl border border-border bg-surface space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton variant="circular" className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="w-3/4 h-4" />
                  <Skeleton variant="text" className="w-1/2 h-3" />
                </div>
              </div>
              <Skeleton variant="rectangular" className="w-full h-32" />
              <div className="flex justify-between">
                <Skeleton variant="text" className="w-24 h-4" />
                <Skeleton variant="text" className="w-16 h-8" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
