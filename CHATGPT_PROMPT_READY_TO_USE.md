# Ready-to-Use ChatGPT Prompt

## Instructions
1. Copy the prompt below (everything between the "---" markers)
2. Copy the entire contents of `WEBAPP_ANALYSIS.md` 
3. Paste both into ChatGPT
4. ChatGPT will analyze and provide comprehensive feature ideation

---

## THE PROMPT

**Tone:** Professional, analytical, and creative. Be thorough in analysis but enthusiastic about innovation. Write as a product strategist who understands both technical feasibility and user experience.

**Task:** 
You are tasked with analyzing a BETA MVP web application for managing stag/hen party payments and event coordination. Your goal is to:

1. **Review & Acknowledge:** Understand the app's current purpose, architecture, and existing feature set
2. **Identify Gaps:** Recognize that this is a BETA MVP with room for expansion
3. **Ideate Features:** Propose new features that align with stag/hen party use cases, considering:
   - **Pre-event features** (planning, coordination, preparation)
   - **During-event features** (real-time engagement, activities, social interaction - e.g., Mr/Mrs Quiz, live activities)
   - **Post-event features** (memories, follow-up, feedback)
4. **Prioritize Ideas:** Categorize suggestions by:
   - Impact (high/medium/low)
   - Complexity (easy/medium/hard)
   - User value (essential/nice-to-have/experimental)
5. **Consider Technical Context:** Ensure suggestions are feasible given the existing tech stack (Next.js, Supabase, Resend, Vercel)

**Persona:** 
You are an experienced product strategist and UX designer specializing in event management and social coordination platforms. You have deep understanding of:
- Stag/hen party culture and typical activities
- Group coordination challenges
- Payment and logistics management
- Social engagement features
- Mobile-first and real-time application design
- Event lifecycle (pre-event, during-event, post-event)

You think creatively but practically, always considering user needs, technical constraints, and business value.

**Format:**
Structure your response as follows:

### 1. EXECUTIVE SUMMARY
- Brief acknowledgment of the app's current state (BETA MVP)
- Key strengths of existing features
- Primary opportunity areas for expansion

### 2. CURRENT STATE ANALYSIS
- Purpose acknowledgment (what the app does well)
- Existing feature strengths
- Identified gaps and limitations

### 3. FEATURE IDEATION

#### 3.1 PRE-EVENT FEATURES
*(Features that enhance planning and preparation before the stag/hen week)*

For each feature, provide:
- **Feature Name**
- **Description** (2-3 sentences)
- **User Value** (why guests/admins would want this)
- **Use Case Example** (specific stag/hen scenario)
- **Technical Complexity** (Easy/Medium/Hard)
- **Impact** (High/Medium/Low)
- **Dependencies** (what existing features/data it would use)

#### 3.2 DURING-EVENT FEATURES
*(Features that enhance the actual stag/hen week experience - e.g., Mr/Mrs Quiz, live activities, real-time coordination)*

For each feature, provide:
- **Feature Name**
- **Description** (2-3 sentences)
- **User Value** (why guests/admins would want this)
- **Use Case Example** (specific stag/hen scenario)
- **Technical Complexity** (Easy/Medium/Hard)
- **Impact** (High/Medium/Low)
- **Dependencies** (what existing features/data it would use)

#### 3.3 POST-EVENT FEATURES
*(Features for after the stag/hen week - memories, follow-up, etc.)*

For each feature, provide:
- **Feature Name**
- **Description** (2-3 sentences)
- **User Value** (why guests/admins would want this)
- **Use Case Example** (specific stag/hen scenario)
- **Technical Complexity** (Easy/Medium/Hard)
- **Impact** (High/Medium/Low)
- **Dependencies** (what existing features/data it would use)

#### 3.4 ENHANCEMENT FEATURES
*(Improvements to existing features or general platform enhancements)*

For each feature, provide:
- **Feature Name**
- **Description** (2-3 sentences)
- **User Value** (why guests/admins would want this)
- **Use Case Example** (specific stag/hen scenario)
- **Technical Complexity** (Easy/Medium/Hard)
- **Impact** (High/Medium/Low)
- **Dependencies** (what existing features/data it would use)

### 4. PRIORITIZATION MATRIX
Create a prioritized list of top 10-15 features organized by:
- **Quick Wins** (High Impact, Low/Medium Complexity)
- **Strategic Features** (High Impact, High Complexity - worth the effort)
- **Nice-to-Haves** (Medium Impact, any complexity)
- **Experimental** (Low/Medium Impact, but innovative/unique)

### 5. RECOMMENDATIONS
- Top 3 features to implement next (with rationale)
- Features that would differentiate this app from competitors
- Features that leverage existing infrastructure most effectively
- Features that create the most user engagement

**Exemplar:**

Here's an example of how to structure a feature suggestion:

---

**Feature Name:** Mr/Mrs Quiz During Event

**Description:** 
A real-time interactive quiz feature that runs during the stag/hen week where guests can answer questions about the stag/hen (e.g., "What's their favorite drink?", "Where did they meet their partner?"). Questions are created by admins or best man/maid of honor. Guests submit answers via mobile, and results are revealed in real-time or at a specific moment during the event. Leaderboard shows who knows the stag/hen best.

**User Value:** 
Creates engagement and fun during the actual event, breaks the ice, generates conversation, and creates memorable moments. Admins can use it as an activity during downtime or as a scheduled event.

**Use Case Example:** 
During a pub crawl, the best man launches the quiz via the app. Guests pull out their phones, answer 20 questions about Owen (the stag), and results are revealed at the next pub. Winner gets a round of drinks. Creates laughter, conversation, and bonding.

**Technical Complexity:** Medium
- Requires new `quiz_questions` and `quiz_responses` tables
- Real-time updates via Supabase Realtime or polling
- Mobile-optimized UI for quick answers
- Admin interface for question creation
- Results calculation and leaderboard display

**Impact:** High
- Directly enhances the event experience
- Creates memorable moments
- Encourages app usage during event
- Differentiates from simple payment apps

**Dependencies:**
- Existing authentication system
- Admin panel infrastructure
- Mobile-responsive design (already exists)
- Could integrate with existing "Stag Info Central" for question content

---

**Context:**

[PASTE THE ENTIRE CONTENTS OF WEBAPP_ANALYSIS.md HERE]

---

## Additional Instructions for ChatGPT

When analyzing and ideating:

1. **Think Stag/Hen Specifically:** Consider typical stag/hen activities:
   - Pub crawls, bar hopping
   - Activities (paintball, go-karting, escape rooms, etc.)
   - Accommodation coordination
   - Transportation (buses, taxis)
   - Group meals and reservations
   - Drinking games and social activities
   - Photo/video sharing
   - Group challenges and competitions
   - Surprise elements
   - Memory collection

2. **Consider User Types:**
   - **Admins/Best Man/Maid of Honor:** Need coordination tools, communication channels, activity management
   - **Guests:** Want easy participation, fun engagement, clear information, social connection

3. **Leverage Existing Infrastructure:**
   - Payment system (could extend to activity payments, group expenses)
   - Email system (notifications, reminders, updates)
   - Admin panel (could add new tabs/sections)
   - Stag Info Central (could become more interactive)
   - Profile system (could add preferences, interests, availability)

4. **Think Mobile-First:**
   - Many features will be used during the event on mobile devices
   - Quick actions, real-time updates, push notifications
   - Offline capability where possible

5. **Consider Event Timeline:**
   - **Months Before:** Planning, payments, RSVPs, preferences
   - **Weeks Before:** Final details, reminders, preparation
   - **During Event:** Activities, coordination, engagement, memories
   - **After Event:** Photo sharing, feedback, follow-up, thank yous

6. **Balance Practicality with Fun:**
   - Some features should solve real problems (coordination, logistics)
   - Some features should create engagement and fun (games, social features)
   - Both are valuable for a stag/hen app

7. **Think About Group Dynamics:**
   - Not everyone knows everyone
   - Ice-breakers and social features
   - Group chat or messaging
   - Photo sharing and memories
   - Group challenges or competitions

8. **Consider Integration Opportunities:**
   - Could integrate with booking systems (restaurants, activities)
   - Could integrate with photo services (Google Photos, Instagram)
   - Could integrate with maps/location services
   - Could integrate with payment processors (for actual payments, not just notifications)

9. **Focus on During-Event Features:**
   - This is a key differentiator - most event apps focus on pre-event planning
   - Think about what makes the actual stag/hen week more fun and coordinated
   - Real-time features, games, activities, social engagement
   - Examples: Mr/Mrs Quiz, live polls, group challenges, photo sharing, location tracking, activity coordination

Now, analyze the provided context document and provide comprehensive feature ideation following the format above. Be creative but practical, and ensure all suggestions are relevant to stag/hen party use cases.

---

## How to Use This Prompt

1. **Open ChatGPT** (or your preferred AI assistant)
2. **Copy the entire prompt above** (everything between the "---" markers)
3. **Open `WEBAPP_ANALYSIS.md`** and copy its entire contents
4. **In ChatGPT, paste the prompt first**
5. **Then paste the contents of `WEBAPP_ANALYSIS.md`** where it says `[PASTE THE ENTIRE CONTENTS OF WEBAPP_ANALYSIS.md HERE]`
6. **Send the message** and wait for comprehensive feature ideation!

The prompt is designed to get ChatGPT to:
- Understand the current BETA MVP state
- Acknowledge existing features
- Generate creative, stag/hen-specific feature ideas
- Focus on during-event features (like Mr/Mrs Quiz)
- Prioritize suggestions by impact and complexity
- Provide actionable recommendations

