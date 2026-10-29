import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
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
  ProgressBar,
  StepTracker,
  ZoneSelector,
  EmptyState,
  Skeleton,
} from '../index';
import { Car } from 'lucide-react';

describe('Design System Accessibility (Axe-Core)', () => {
  it('Button passes axe checks', async () => {
    const { container } = render(
      <main>
        <Button variant="primary">Confirm Order</Button>
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('Input with label and error state passes axe checks', async () => {
    const { container } = render(
      <main>
        <Input
          label="Mobile Number"
          placeholder="Enter 10-digit number"
          error="Invalid mobile number format"
        />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('OTPInput passes axe checks', async () => {
    const { container } = render(
      <main>
        <OTPInput length={6} />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('Select dropdown passes axe checks', async () => {
    const { container } = render(
      <main>
        <Select
          label="Choose Fuel Type"
          options={[
            { value: 'PETROL', label: 'Petrol' },
            { value: 'DIESEL', label: 'Diesel' },
          ]}
        />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('Card passes axe checks', async () => {
    const { container } = render(
      <main>
        <Card>
          <CardHeader>
            <CardTitle>Group Summary</CardTitle>
            <CardDescription>Maruti Swift Baramati Group</CardDescription>
          </CardHeader>
          <CardContent>
            <p>4 of 5 buyers joined.</p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Join Group</Button>
          </CardFooter>
        </Card>
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('Badge and VerifiedBadge pass axe checks', async () => {
    const { container } = render(
      <main>
        <Badge variant="primary">Active RFQ</Badge>
        <VerifiedBadge label="Verified Dealer" />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('ProgressBar passes axe checks', async () => {
    const { container } = render(
      <main>
        <ProgressBar current={4} total={5} label="Group Formation" />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('StepTracker passes axe checks', async () => {
    const { container } = render(
      <main>
        <StepTracker
          steps={[
            { id: '1', title: 'Group Formed' },
            { id: '2', title: 'Reverse Auction' },
            { id: '3', title: 'Delivered' },
          ]}
          currentStepIndex={1}
        />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('ZoneSelector stub passes axe checks', async () => {
    const { container } = render(
      <main>
        <ZoneSelector />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('EmptyState passes axe checks', async () => {
    const { container } = render(
      <main>
        <EmptyState
          icon={Car}
          title="No Active Groups in Baramati"
          description="Be the first to start a group for your taluka and unlock reverse auction discounts."
          actionLabel="Create Group"
          onAction={() => {}}
        />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });

  it('Skeleton loader passes axe checks', async () => {
    const { container } = render(
      <main>
        <Skeleton className="w-48 h-6" />
      </main>,
    );
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
