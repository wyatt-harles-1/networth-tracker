import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Save, User, Calendar, TrendingUp, Code } from 'lucide-react';

interface ProfileUpdate {
  full_name: string | null;
  date_of_birth: string | null;
  retirement_target_age: number;
  retirement_goal_amount: number | null;
  expected_monthly_contribution: number | null;
  updated_at: string;
}

export function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [retirementTargetAge, setRetirementTargetAge] = useState('65');
  const [retirementGoalAmount, setRetirementGoalAmount] = useState('');
  const [expectedMonthlyContribution, setExpectedMonthlyContribution] =
    useState('');

  // Developer Tools
  const [enableDataVisualizer, setEnableDataVisualizer] = useState(
    () => localStorage.getItem('enableDataVisualizer') === 'true'
  );

  const loadProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } else if (data) {
      setFullName(data.full_name || '');
      setDateOfBirth(data.date_of_birth || '');
      setRetirementTargetAge(data.retirement_target_age?.toString() || '65');
      setRetirementGoalAmount(data.retirement_goal_amount?.toString() || '');
      setExpectedMonthlyContribution(
        data.expected_monthly_contribution?.toString() || ''
      );
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    const updates: ProfileUpdate = {
      full_name: fullName.trim() || null,
      date_of_birth: dateOfBirth || null,
      retirement_target_age: retirementTargetAge
        ? parseInt(retirementTargetAge)
        : 65,
      retirement_goal_amount: retirementGoalAmount
        ? parseFloat(retirementGoalAmount)
        : null,
      expected_monthly_contribution: expectedMonthlyContribution
        ? parseFloat(expectedMonthlyContribution)
        : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      console.error('Error saving profile:', error);
      setMessage({
        type: 'error',
        text: 'Failed to save profile. Please try again.',
      });
    } else {
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const calculateAge = () => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const calculateYearsToRetirement = () => {
    const currentAge = calculateAge();
    if (!currentAge || !retirementTargetAge) return null;
    const targetAge = parseInt(retirementTargetAge);
    return Math.max(0, targetAge - currentAge);
  };

  const handleToggleDataVisualizer = () => {
    const newValue = !enableDataVisualizer;
    setEnableDataVisualizer(newValue);
    localStorage.setItem('enableDataVisualizer', newValue.toString());

    // Show success message
    setMessage({
      type: 'success',
      text: newValue
        ? 'Data Visualizer enabled! Check the menu.'
        : 'Data Visualizer disabled.',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-4 pb-20 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Profile Settings
          </h2>
          <p className="text-sm text-gray-600">
            Manage your personal information and retirement planning details
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <Card
            className={`p-4 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {message.text}
            </p>
          </Card>
        )}

        {/* Personal Information */}
        <Card className="p-6 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Personal Information
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="full-name"
                className="text-sm font-medium text-gray-900"
              >
                Full Name
              </Label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="date-of-birth"
                className="text-sm font-medium text-gray-900"
              >
                Date of Birth
              </Label>
              <Input
                id="date-of-birth"
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="mt-1"
              />
              {calculateAge() !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Current age: {calculateAge()} years
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Retirement Planning */}
        <Card className="p-6 bg-white shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Retirement Planning
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="retirement-age"
                className="text-sm font-medium text-gray-900"
              >
                Target Retirement Age
              </Label>
              <Input
                id="retirement-age"
                type="number"
                min="50"
                max="100"
                value={retirementTargetAge}
                onChange={e => setRetirementTargetAge(e.target.value)}
                placeholder="65"
                className="mt-1"
              />
              {calculateYearsToRetirement() !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Years until retirement: {calculateYearsToRetirement()} years
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="retirement-goal"
                className="text-sm font-medium text-gray-900"
              >
                Retirement Savings Goal
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  $
                </span>
                <Input
                  id="retirement-goal"
                  type="number"
                  step="1000"
                  value={retirementGoalAmount}
                  onChange={e => setRetirementGoalAmount(e.target.value)}
                  placeholder="1000000"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your target portfolio value at retirement
              </p>
            </div>

            <div>
              <Label
                htmlFor="monthly-contribution"
                className="text-sm font-medium text-gray-900"
              >
                Expected Monthly Contribution
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  $
                </span>
                <Input
                  id="monthly-contribution"
                  type="number"
                  step="10"
                  value={expectedMonthlyContribution}
                  onChange={e => setExpectedMonthlyContribution(e.target.value)}
                  placeholder="500"
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                How much you plan to invest each month
              </p>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Why do we need this information?
              </p>
              <p className="text-xs text-blue-700">
                Your demographic and retirement planning information helps us
                provide accurate projections and personalized insights on the
                Insights page. This data is stored securely and never shared
                with third parties.
              </p>
            </div>
          </div>
        </Card>

        {/* Developer Tools */}
        <Card className="p-6 bg-white shadow-md border-2 border-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Developer Tools
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Historical Data Visualizer
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  View price data coverage and gaps across all assets with interactive calendar
                </p>
              </div>
              <Button
                variant={enableDataVisualizer ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleDataVisualizer}
                className={
                  enableDataVisualizer
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : ''
                }
              >
                {enableDataVisualizer ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>Debug Tool:</strong> These features are intended for
              development and troubleshooting. They provide advanced data
              insights and management capabilities.
            </p>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
