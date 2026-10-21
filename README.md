# Sidequest — Social Gaming Prototype

A React + Vite social arcade. It can be deployed on Cloudflare Pages. This version adds an invite-link room flow and optional Supabase Realtime chat/presence wiring. Live networking is disabled until you add your own Supabase project credentials.

## Run locally
1. Install Node.js LTS.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in your Supabase Project URL and publishable client key (optional for UI-only demo mode).
4. Run `npm run dev` and open the local URL Vite prints.

## Supabase setup for live room chat
1. Create a Supabase project.
2. Copy the Project URL and publishable client key into `.env.local`.
3. In Supabase, enable Realtime for your project.
4. Restart the Vite dev server after changing environment variables.
5. Open the same invite link in two different browsers/devices to test broadcast chat.

This prototype uses a room ID as an invite secret and broadcasts room messages over a Realtime channel. Anyone who has the invite URL may join, so only share it with people you trust. The starter does not yet have authentication, durable room discovery, message history, robust moderation, or multiplayer game-state sync. Do not treat invite links as private or secure access control.

## Cloudflare Pages deployment
1. Push this project to a GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Import an existing Git repository**.
3. Set build command to `npm run build` and output directory to `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables in the Pages project settings.
5. Deploy. After changing environment variables, trigger a new deployment.

You can also deploy a Vite static site with Cloudflare Pages Direct Upload, but Git integration is easier for ongoing updates.

## Included
- Responsive home, discover, rooms, arcade, room chat, and game screens
- Invite-link rooms
- Optional Supabase Realtime chat and presence connection
- Playable Snake, click-to-fill block puzzle, and quiz
- Local demo mode when Supabase credentials are absent

## Next milestones
- Supabase Auth and a durable rooms/messages schema with Row Level Security
- Block/report/mute controls, rate limits, and abuse handling
- Shared game state and turn-taking
- Voice/video calling after access controls and safety workflows are in place

Keep server-only secrets out of the frontend. Only use a public/publishable client key in `VITE_*` variables; never put a service-role or secret key in a browser build.
