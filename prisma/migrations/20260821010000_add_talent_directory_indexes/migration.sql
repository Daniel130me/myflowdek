-- Add indexes used by the Phase 2 professional directory filters.
CREATE INDEX "ProfessionalProfile_status_visibility_professionalTitle_idx" ON "ProfessionalProfile"("status", "visibility", "professionalTitle");
CREATE INDEX "ProfessionalProfile_status_visibility_location_idx" ON "ProfessionalProfile"("status", "visibility", "location");
CREATE INDEX "ProfessionalProfile_status_visibility_timezone_idx" ON "ProfessionalProfile"("status", "visibility", "timezone");
CREATE INDEX "ProfessionalProfile_status_visibility_remotePreference_idx" ON "ProfessionalProfile"("status", "visibility", "remotePreference");
CREATE INDEX "ProfessionalProfile_status_visibility_rateType_minimumRate_idx" ON "ProfessionalProfile"("status", "visibility", "rateType", "minimumRate");
