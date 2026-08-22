-- Payment reliability must not be rated when an engagement had no Flowdek
-- payment, so the rating is intentionally nullable.
ALTER TABLE "ClientReview" ALTER COLUMN "paymentRating" DROP NOT NULL;
