import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Customer from "../models/Customer.js";
import Employee from "../models/Employee.js";
import jwt from "jsonwebtoken";

// Ensure env variables from project root .env are loaded
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Google OAuth Strategy (only if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let user = await Customer.findOne({
            oauthId: profile.id,
            oauthProvider: "google",
          });

          if (!user) {
            // Check if user exists with this email
            user = await Customer.findOne({ email: profile.emails[0].value });

            if (user) {
              // Link Google account to existing user
              user.oauthId = profile.id;
              user.oauthProvider = "google";
              user.emailVerified = true; // Google emails are verified
              await user.save();
            } else {
              // Create new user
              user = new Customer({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                oauthId: profile.id,
                oauthProvider: "google",
                emailVerified: true, // Google emails are verified
                password: null, // No password for OAuth users
              });
              await user.save();
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log("✅ Google OAuth configured");
} else {
  console.log(
    "⚠️  Google OAuth not configured (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required)"
  );
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await Customer.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
