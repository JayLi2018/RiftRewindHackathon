# LeagueCoach: AI-Powered League of Legends Coaching Assistant

**Live demo:** [https://leaguecoach.netlify.app/](https://leaguecoach.netlify.app/)

---

## 🧠 Overview

**LeagueCoach** is an AI-powered performance analysis and coaching platform for *League of Legends* players.  
It analyzes your recent match data, compares your stats against players in your target rank, and generates tailored coaching feedback using an **Amazon Bedrock agent**.

---

## 🌐 Quick Start

1. **Open the app**  
   👉 [https://leaguecoach.netlify.app/](https://leaguecoach.netlify.app/)

2. **Enter your Riot ID**  
   Example:  You2Bir#NA1
   
3. **Select target rank**  
Choose a rank (**Diamond II only**) — currently the only rank available in the S3 bucket — to compare yourself against.

4. **Choose roles and champions (optional)**  
- You can select **1–2 roles** and up to **2 champions**.  
- Or skip to analyze all recent ranked games.  
- For this example (`You2Bir#NA1`), please choose **Jhin**.

5. **Click “Get Coaching”**  
- The system fetches your recent matches via the **Riot API**.  
- It compares your stats against the rank averages (kills, deaths, assists, CS/min, etc.).  
- Then it automatically calls a **Bedrock-hosted AI coach** to produce personalized feedback.

6. **Read your coaching tips**  
- A champion icon appears with a chat bubble showing your improvement advice.  
- Example:  
  *“Your CS/min is lower than average for Diamond ADCs — focus on wave management and tempo resets.”*
