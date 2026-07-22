ALTER TABLE "similarity_matches"
  ADD CONSTRAINT "similarity_matches_monitoredTrademarkId_publicationId_key"
  UNIQUE ("monitoredTrademarkId", "publicationId");
