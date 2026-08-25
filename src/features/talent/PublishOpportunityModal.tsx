'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  Clock,
  ChevronDown,
  DollarSign,
  Globe,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import { routes } from '@/shared/navigation/routes';
import styles from './talent.module.css';
import type { ProficiencyLevel, PublicOpportunity, RateType, SkillOption } from './types';
import { readApiMessage } from './types';

interface PublishOpportunityModalProps {
  taskId: string;
  taskTitle: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

function OptionDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  compact = false,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={dropdownRef} className={`${styles.optionMenuWrap} ${compact ? styles.optionMenuCompact : ''}`}>
      <button
        type="button"
        className={styles.skillMenuTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span>{selected?.label ?? 'Select an option'}</span>
        <ChevronDown className={styles.skillMenuChevron} aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.skillMenu} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={styles.skillMenuOption}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PublishOpportunityModal({
  taskId,
  taskTitle,
  projectId,
  isOpen,
  onClose,
}: PublishOpportunityModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [opportunity, setOpportunity] = useState<PublicOpportunity | null>(null);

  // Form fields
  const [title, setTitle] = useState(taskTitle);
  const [description, setDescription] = useState('');
  const [deliverablesSummary, setDeliverablesSummary] = useState('');
  const [budgetType, setBudgetType] = useState<RateType>('FIXED');
  const [minimumBudget, setMinimumBudget] = useState('');
  const [maximumBudget, setMaximumBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [expectedDuration, setExpectedDuration] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [requiredSkills, setRequiredSkills] = useState<
    { skillId: string; minimumProficiency: ProficiencyLevel; isRequired: boolean; notes?: string }[]
  >([]);

  const [availableSkills, setAvailableSkills] = useState<SkillOption[]>([]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const skillMenuRef = useRef<HTMLDivElement>(null);

  // Load skills taxonomy
  useEffect(() => {
    fetch('/api/talent/skills')
      .then((res) => (res.ok ? res.json() : { skills: [] }))
      .then((payload) => setAvailableSkills(payload.skills ?? []))
      .catch(() => setAvailableSkills([]));
  }, []);

  const loadOpportunity = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/opportunity`);
      if (res.ok) {
        const data = await res.json();
        if (data.opportunity) {
          const opp: PublicOpportunity = data.opportunity;
          setOpportunity(opp);
          setTitle(opp.title);
          setDescription(opp.description);
          setDeliverablesSummary(opp.deliverablesSummary ?? '');
          setBudgetType(opp.budgetType ?? 'FIXED');
          setMinimumBudget(opp.minimumBudget ?? '');
          setMaximumBudget(opp.maximumBudget ?? '');
          setCurrency(opp.currency ?? 'USD');
          setExpectedDuration(opp.expectedDuration ?? '');
          setApplicationDeadline(
            opp.applicationDeadline ? opp.applicationDeadline.split('T')[0] : '',
          );
          setRequiredSkills(
            opp.requiredSkills.map((s) => ({
              skillId: s.skill.id,
              minimumProficiency: s.minimumProficiency,
              isRequired: s.isRequired,
              notes: s.notes ?? undefined,
            })),
          );
        } else {
          // Defaults for new draft
          setTitle(taskTitle);
          setDescription(
            `Looking for a qualified professional to complete the "${taskTitle}" task.`,
          );
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load opportunity draft.');
    } finally {
      setLoading(false);
    }
  }, [taskId, taskTitle, isOpen]);

  useEffect(() => {
    loadOpportunity();
  }, [loadOpportunity]);

  useEffect(() => {
    if (!skillMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!skillMenuRef.current?.contains(event.target as Node)) {
        setSkillMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [skillMenuOpen]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        title,
        description,
        deliverablesSummary: deliverablesSummary.trim() || undefined,
        budgetType,
        minimumBudget: minimumBudget ? Number(minimumBudget) : undefined,
        maximumBudget: maximumBudget ? Number(maximumBudget) : undefined,
        currency,
        expectedDuration: expectedDuration.trim() || undefined,
        applicationDeadline: applicationDeadline
          ? new Date(applicationDeadline).toISOString()
          : undefined,
        requiredSkills,
      };

      const res = await fetch(`/api/tasks/${taskId}/opportunity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await readApiMessage(res));

      const data = await res.json();
      setOpportunity(data.opportunity);
      setSuccess('Opportunity draft saved successfully.');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save opportunity.');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: 'publish' | 'unpublish' | 'close' | 'cancel') => {
    setActionInProgress(action);
    setError(null);
    setSuccess(null);
    try {
      // First save any unsaved changes if publishing
      if (action === 'publish') {
        const saveRes = await fetch(`/api/tasks/${taskId}/opportunity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            deliverablesSummary: deliverablesSummary.trim() || undefined,
            budgetType,
            minimumBudget: minimumBudget ? Number(minimumBudget) : undefined,
            maximumBudget: maximumBudget ? Number(maximumBudget) : undefined,
            currency,
            expectedDuration: expectedDuration.trim() || undefined,
            applicationDeadline: applicationDeadline
              ? new Date(applicationDeadline).toISOString()
              : undefined,
            requiredSkills,
          }),
        });
        if (!saveRes.ok) throw new Error(await readApiMessage(saveRes));
      }

      const res = await fetch(`/api/tasks/${taskId}/opportunity/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(await readApiMessage(res));

      const data = await res.json();
      setOpportunity(data.opportunity);
      setSuccess(
        action === 'publish'
          ? 'Opportunity published to the Talent Marketplace!'
          : `Opportunity status updated to ${action}.`,
      );
    } catch (err: any) {
      setError(err?.message ?? `Failed to ${action} opportunity.`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAddSkill = (skillId: string) => {
    if (!skillId || requiredSkills.some((s) => s.skillId === skillId)) return;
    setRequiredSkills((prev) => [
      ...prev,
      { skillId, minimumProficiency: 'INTERMEDIATE', isRequired: true },
    ]);
  };

  const handleRemoveSkill = (skillId: string) => {
    setRequiredSkills((prev) => prev.filter((s) => s.skillId !== skillId));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Flowdek Talent Opportunity</h2>
              <p className="text-xs text-muted-foreground">
                Publish this task to the Talent Network marketplace to receive qualified proposals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Current Opportunity Status Banner */}
          {opportunity && (
            <div className="p-4 rounded-xl bg-secondary/60 border border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Status:</span>
                <span
                  className={`ml-2 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    opportunity.status === 'PUBLISHED'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : opportunity.status === 'AWARDED'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {opportunity.status}
                </span>
                <span className="ml-3 text-xs text-muted-foreground">
                  Proposals: <strong>{opportunity.proposalsCount}</strong>
                </span>
              </div>
              {opportunity.id && (
                <Link
                  href={routes.talentOpportunity(opportunity.id)}
                  target="_blank"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View Public Listing →
                </Link>
              )}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className={styles.fieldLabel}>Public Listing Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Clear, descriptive title for the talent marketplace"
                className={styles.textInput}
              />
            </div>

            <div>
              <label className={styles.fieldLabel}>Detailed Scope & Requirements</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the background, goals, and technical requirements..."
                className={styles.textareaInput}
              />
            </div>

            <div>
              <label className={styles.fieldLabel}>Key Deliverables Summary (Optional)</label>
              <textarea
                rows={2}
                value={deliverablesSummary}
                onChange={(e) => setDeliverablesSummary(e.target.value)}
                placeholder="List specific milestones, pull requests, or deliverables expected..."
                className={styles.textareaInput}
              />
            </div>

            {/* Budget & Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={styles.fieldLabel}>Budget Type</label>
                <OptionDropdown
                  value={budgetType}
                  onChange={(value) => setBudgetType(value as RateType)}
                  ariaLabel="Budget type"
                  options={[
                    { value: 'FIXED', label: 'Fixed Price' },
                    { value: 'HOURLY', label: 'Hourly Rate' },
                    { value: 'NEGOTIABLE', label: 'Negotiable' },
                  ]}
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Min Budget ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={minimumBudget}
                  onChange={(e) => setMinimumBudget(e.target.value)}
                  placeholder="e.g. 300"
                  className={styles.textInput}
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Max Budget ({currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={maximumBudget}
                  onChange={(e) => setMaximumBudget(e.target.value)}
                  placeholder="e.g. 800"
                  className={styles.textInput}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={styles.fieldLabel}>Expected Duration</label>
                <input
                  type="text"
                  value={expectedDuration}
                  onChange={(e) => setExpectedDuration(e.target.value)}
                  placeholder="e.g. 1 week, 3-5 business days"
                  className={styles.textInput}
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Application Deadline</label>
                <input
                  type="date"
                  value={applicationDeadline}
                  onChange={(e) => setApplicationDeadline(e.target.value)}
                  className={styles.textInput}
                />
              </div>
            </div>

            {/* Skill Requirements */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={styles.fieldLabel}>Required Skills & Proficiencies</label>
              </div>

              {/* Add skill menu */}
              <div ref={skillMenuRef} className={styles.skillMenuWrap}>
                <button
                  id="add-opportunity-skill"
                  type="button"
                  className={styles.skillMenuTrigger}
                  aria-haspopup="listbox"
                  aria-expanded={skillMenuOpen}
                  onClick={() => {
                    setSkillMenuOpen((open) => !open);
                    setSkillSearch('');
                  }}
                >
                  <span>+ Add required skill</span>
                  <ChevronDown className={styles.skillMenuChevron} aria-hidden="true" />
                </button>
                {skillMenuOpen && (
                  <div className={styles.skillMenu} role="listbox" aria-label="Required skills">
                    <input
                      type="search"
                      value={skillSearch}
                      onChange={(event) => setSkillSearch(event.target.value)}
                      placeholder="Search skills..."
                      aria-label="Search required skills"
                      className={styles.skillSearch}
                    />
                    {availableSkills
                      .filter((skill) => !requiredSkills.some((required) => required.skillId === skill.id))
                      .filter((skill) => `${skill.name} ${skill.category}`.toLowerCase().includes(skillSearch.toLowerCase()))
                      .map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          role="option"
                          className={styles.skillMenuOption}
                          onClick={() => {
                            handleAddSkill(skill.id);
                            setSkillMenuOpen(false);
                          }}
                        >
                          <span>{skill.name}</span>
                          <span className={styles.skillCategory}>{skill.category.replaceAll('_', ' ')}</span>
                        </button>
                      ))}
                    {availableSkills
                      .filter((skill) => !requiredSkills.some((required) => required.skillId === skill.id))
                      .filter((skill) => `${skill.name} ${skill.category}`.toLowerCase().includes(skillSearch.toLowerCase())).length === 0 && (
                      <span className={styles.skillMenuEmpty}>{skillSearch ? 'No matching skills' : 'All available skills added'}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Selected skills list */}
              <div className="space-y-2">
                {requiredSkills.map((req) => {
                  const skillObj = availableSkills.find((s) => s.id === req.skillId);
                  return (
                    <div
                      key={req.skillId}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-secondary/30"
                    >
                      <span className="font-semibold text-xs flex-1">
                        {skillObj?.name ?? 'Skill'}
                      </span>
                      <OptionDropdown
                        value={req.minimumProficiency}
                        onChange={(value) =>
                          setRequiredSkills((prev) =>
                            prev.map((skill) =>
                              skill.skillId === req.skillId
                                ? { ...skill, minimumProficiency: value as ProficiencyLevel }
                                : skill,
                            ),
                          )
                        }
                        ariaLabel={`Minimum proficiency for ${skillObj?.name ?? 'skill'}`}
                        compact
                        options={[
                          { value: 'BEGINNER', label: 'Beginner' },
                          { value: 'INTERMEDIATE', label: 'Intermediate' },
                          { value: 'ADVANCED', label: 'Advanced' },
                          { value: 'EXPERT', label: 'Expert' },
                        ]}
                      />
                      <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={req.isRequired}
                          onChange={(e) =>
                            setRequiredSkills((prev) =>
                              prev.map((s) =>
                                s.skillId === req.skillId
                                  ? { ...s, isRequired: e.target.checked }
                                  : s,
                              ),
                            )
                          }
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(req.skillId)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex flex-wrap justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-secondary"
          >
            Close
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !!actionInProgress}
              onClick={handleSaveDraft}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-secondary hover:bg-secondary/80 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Save Draft'}
            </button>

            {opportunity?.status === 'PUBLISHED' ? (
              <>
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={() => handleAction('unpublish')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
                >
                  Unpublish to Draft
                </button>
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={() => handleAction('close')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-secondary"
                >
                  Close Applications
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={saving || !!actionInProgress}
                onClick={() => handleAction('publish')}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm flex items-center gap-1.5"
              >
                {actionInProgress === 'publish' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                Publish to Marketplace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
