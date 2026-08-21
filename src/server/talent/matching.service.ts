import { db } from '@/server/db/client';
import { ServiceError } from '@/server/http/errors';
import { GoogleGenAI } from '@google/genai';

export interface TalentMatchResult {
  professionalProfileId: string;
  slug: string;
  displayName: string;
  professionalTitle: string | null;
  avatarColor: string | null;
  hourlyRate: string | null;
  currency: string;
  score: number;
  matchTier: 'Strong match' | 'Good match' | 'Partial match';
  scoreBreakdown: {
    requiredSkillsScore: number; // Max 40
    preferredSkillsScore: number; // Max 15
    roleRelevanceScore: number; // Max 10
    availabilityScore: number; // Max 10
    budgetScore: number; // Max 10
    historyScore: number; // Max 10
    timezoneScore: number; // Max 5
  };
  reasons: string[];
  missingSkills: string[];
}

const PROFICIENCY_RANKS: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

export class MatchingService {
  /**
   * Generates ranked, explainable talent recommendations for a specific task
   */
  async getTaskTalentMatches(taskId: string): Promise<TalentMatchResult[]> {
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        competencyRequirements: {
          include: { skill: true },
        },
      },
    });

    if (!task) {
      throw new ServiceError('Task not found', 404);
    }

    const taskRequirements = task.competencyRequirements;
    const requiredSkills = taskRequirements.filter((r) => r.isRequired);
    const preferredSkills = taskRequirements.filter((r) => !r.isRequired);

    // Fetch published professional profiles
    const profiles = await db.professionalProfile.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'FLOWDEK_USERS',
      },
      include: {
        user: { select: { id: true, name: true, avatarColor: true } },
        skills: { include: { skill: true } },
        roles: { include: { role: true } },
        metrics: true,
        availability: true,
      },
    });

    const results: TalentMatchResult[] = [];

    for (const profile of profiles) {
      let requiredSkillsScore = 0;
      let preferredSkillsScore = 0;
      let roleRelevanceScore = 0;
      let availabilityScore = 0;
      let budgetScore = 0;
      let historyScore = 0;
      let timezoneScore = 5; // Default full timezone compatibility score

      const reasons: string[] = [];
      const missingSkills: string[] = [];

      const proSkillMap = new Map<string, number>();
      profile.skills.forEach((ps) => {
        proSkillMap.set(ps.skillId, PROFICIENCY_RANKS[ps.proficiency] || 1);
      });

      // 1. Required Skill Coverage (40%)
      if (requiredSkills.length > 0) {
        let matchedRequired = 0;
        requiredSkills.forEach((req) => {
          const proProficiency = proSkillMap.get(req.skillId);
          const requiredMin = PROFICIENCY_RANKS[req.minimumProficiency] || 1;
          if (proProficiency !== undefined && proProficiency >= requiredMin) {
            matchedRequired++;
          } else {
            missingSkills.push(req.skill.name);
          }
        });
        const ratio = matchedRequired / requiredSkills.length;
        requiredSkillsScore = Math.round(ratio * 40);
        if (matchedRequired === requiredSkills.length) {
          reasons.push(`Has all ${requiredSkills.length} required skills`);
        } else if (matchedRequired > 0) {
          reasons.push(`Matches ${matchedRequired} of ${requiredSkills.length} required skills`);
        }
      } else {
        requiredSkillsScore = 40; // Full score if no strict required skills defined
      }

      // 2. Preferred Skill Coverage (15%)
      if (preferredSkills.length > 0) {
        let matchedPreferred = 0;
        preferredSkills.forEach((pref) => {
          const proProficiency = proSkillMap.get(pref.skillId);
          const prefMin = PROFICIENCY_RANKS[pref.minimumProficiency] || 1;
          if (proProficiency !== undefined && proProficiency >= prefMin) {
            matchedPreferred++;
          }
        });
        const ratio = matchedPreferred / preferredSkills.length;
        preferredSkillsScore = Math.round(ratio * 15);
        if (matchedPreferred > 0) {
          reasons.push(`Matches ${matchedPreferred} preferred skills`);
        }
      } else {
        preferredSkillsScore = 15;
      }

      // 3. Role Relevance (10%)
      if (profile.roles.length > 0) {
        roleRelevanceScore = 10;
        reasons.push(`Specializes as ${profile.professionalTitle || profile.roles[0]?.role.name}`);
      } else {
        roleRelevanceScore = 5;
      }

      // 4. Availability (10%)
      const availStatus = profile.availability?.status;
      if (availStatus === 'AVAILABLE_NOW' || !availStatus) {
        availabilityScore = 10;
        reasons.push('Available for new task engagements');
      } else if (availStatus === 'LIMITED' || availStatus === 'AVAILABLE_SOON') {
        availabilityScore = 6;
        reasons.push('Partially available');
      } else {
        availabilityScore = 0;
      }

      // 5. Budget Compatibility (10%)
      const rateDisplay = profile.minimumRate ? profile.minimumRate.toString() : null;
      if (rateDisplay) {
        budgetScore = 10;
        reasons.push(`Rate: ${profile.currency || 'USD'} ${rateDisplay}/hr`);
      } else {
        budgetScore = 10;
      }

      // 6. Verified Engagement History & Trust Metrics (10%)
      const metrics = profile.metrics;
      if (metrics && metrics.completedEngagements > 0) {
        historyScore = Math.min(10, Math.round((metrics.completedEngagements * 2) + (metrics.averageRating)));
        reasons.push(`Completed ${metrics.completedEngagements} Flowdek engagements (${metrics.averageRating.toFixed(1)} ★)`);
      } else {
        historyScore = 5; // Neutral starting score for new verified contractors
      }

      const totalScore = Math.min(
        100,
        requiredSkillsScore +
          preferredSkillsScore +
          roleRelevanceScore +
          availabilityScore +
          budgetScore +
          historyScore +
          timezoneScore
      );

      let matchTier: 'Strong match' | 'Good match' | 'Partial match' = 'Partial match';
      if (totalScore >= 80) matchTier = 'Strong match';
      else if (totalScore >= 60) matchTier = 'Good match';

      results.push({
        professionalProfileId: profile.id,
        slug: profile.slug,
        displayName: profile.user.name || 'Flowdek Professional',
        professionalTitle: profile.professionalTitle,
        avatarColor: profile.user.avatarColor,
        hourlyRate: rateDisplay,
        currency: profile.currency || 'USD',
        score: totalScore,
        matchTier,
        scoreBreakdown: {
          requiredSkillsScore,
          preferredSkillsScore,
          roleRelevanceScore,
          availabilityScore,
          budgetScore,
          historyScore,
          timezoneScore,
        },
        reasons,
        missingSkills,
      });
    }

    // Sort candidates by match score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Suggests required and preferred skill competencies based on task title and description
   */
  async suggestTaskCompetencies(taskId: string) {
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, name: true },
    });

    if (!task) {
      throw new ServiceError('Task not found', 404);
    }

    const allSkills = await db.skill.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
    });

    const textToAnalyze = `${task.name}`.toLowerCase();
    const suggested: { skillId: string; name: string; minimumProficiency: number; isRequired: boolean; notes: string }[] = [];

    // Rule-based keyword matching against taxonomy skills
    allSkills.forEach((skill) => {
      const skillLower = skill.name.toLowerCase();
      if (textToAnalyze.includes(skillLower)) {
        suggested.push({
          skillId: skill.id,
          name: skill.name,
          minimumProficiency: 3,
          isRequired: true,
          notes: `Extracted from task keyword '${skill.name}'`,
        });
      }
    });

    // Server-side Gemini AI assistance if GEMINI_API_KEY is configured
    if (process.env.GEMINI_API_KEY && suggested.length === 0) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Given the task title "${task.name}", select up to 3 relevant skill names from this list: ${allSkills.map((s) => s.name).join(', ')}. Return a JSON array of skill names.`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text || '';
        allSkills.forEach((skill) => {
          if (text.toLowerCase().includes(skill.name.toLowerCase()) && !suggested.some((s) => s.skillId === skill.id)) {
            suggested.push({
              skillId: skill.id,
              name: skill.name,
              minimumProficiency: 3,
              isRequired: false,
              notes: 'Suggested by Flowdek AI helper',
            });
          }
        });
      } catch (err) {
        console.warn('Gemini competency suggestion skipped:', err);
      }
    }

    return { taskId, suggestions: suggested };
  }
}

export const matchingService = new MatchingService();
