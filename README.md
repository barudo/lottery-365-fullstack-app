# Lottery365

Lottery365 is a full-stack 6/49 Lotto application based on an ASP.NET backend, SQL database, and React frontend. The application supports two user roles: `Admin` and `Player`.

The main goal of the project is functional completeness: players can register, log in, manage their profiles, place lotto bets by creating tickets, view their submitted tickets, and see drawn winning tickets. Admin users can manage users and run lotto draws.

## Project Brief

Job title: **Asp.net react/vuejs lottery game**

The requested application should include:

- Backend built with ASP.NET and SQL.
- Frontend built with React.
- Two user roles: Admin and Player.
- Player registration and authentication.
- Player profile editing.
- 6/49 Lotto ticket composition using 6 unique numbers from 1 to 49.
- Multiple tickets per player for the same draw.
- Saved player tickets shown in a "My Tickets" page.
- Drawn tickets page showing winning numbers from all draws.
- Admin page listing all users.
- Admin round drawing page that generates and saves the next round's winning numbers.

## Tech Stack

- Backend: ASP.NET Core Web API
- Database: SQL Server
- Frontend: React with TypeScript
- Authentication: JWT-based authentication
- ORM: Entity Framework Core
- Styling: simple responsive CSS or a lightweight component library

## Getting Started

### Prerequisites

- Node.js (version 18 or later)
- .NET SDK (version 8 or later)
- SQL Server (local or remote instance)

### Database Setup

1. Ensure SQL Server is running and accessible.
2. Update the connection string in `backend/appsettings.json` if needed.
3. Run migrations: `dotnet ef database update --project backend/Lottery365.Api.csproj`

### Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Run the application: `dotnet run --project Lottery365.Api.csproj`
3. The backend will start on `http://localhost:5121`

### Frontend Setup

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. The frontend will start on `http://localhost:5173`

### Running the Application

- Open `http://localhost:5173` in your browser.
- Register a new account or log in.
- For admin access, use the admin user created by migrations:
  - Email: `admin@lottery365.local`
  - Password: `Admin123!`

## User Roles

### Player

Players can:

- Register an account.
- Log in.
- View and edit their profile.
- Compose 6/49 Lotto tickets.
- View all of their submitted tickets.
- View all drawn winning tickets.

### Admin

Admins can:

- View a list of all registered users.
- Start the next lottery round.
- Generate 6 random winning numbers from 1 to 49.
- Save drawn winning numbers so they appear on the drawn tickets page.

## Core Features

### Registration

Players should be able to create an account by providing the required account and profile information.

Recommended fields:

- First name
- Last name
- Email
- Password
- Confirm password

### Login

Users should be able to log in with their credentials. After login, users should be redirected based on their role:

- Player: player dashboard or ticket composition page
- Admin: admin dashboard

### Profile

Players should be able to view and edit their profile details.

Recommended editable fields:

- First name
- Last name
- Email
- Password change, if implemented

### Compose Ticket

Players should be able to place a bet by creating a 6/49 Lotto ticket. Each ticket contains exactly 6 selected numbers.

Validation rules:

- Each number must be between 1 and 49.
- Exactly 6 numbers are required.
- All 6 numbers must be different.
- A valid ticket can be saved to the player's "My Tickets" page.
- A player can create multiple tickets for the same draw.

### My Tickets

Players should be able to view all tickets they have submitted, including multiple tickets for the same draw.

Recommended ticket details:

- Ticket ID
- Selected numbers
- Round number
- Submission date

### Drawn Tickets

All users should be able to view previous lottery rounds and their winning numbers.

Recommended drawn ticket details:

- Round number
- Winning numbers
- Draw date

### Admin: Users List

Admins should be able to view all registered users.

Recommended user details:

- User ID
- Name
- Email
- Role
- Registration date

### Admin: Play Round

Admins should have a page with a button to start the next round.

When the admin starts a round:

1. The backend generates 6 unique random numbers from 1 to 49.
2. A new round record is created.
3. The winning numbers are saved.
4. The result appears on the drawn tickets page.

## Recommended Database Tables

### Users

Stores registered users.

Suggested columns:

- `Id`
- `FirstName`
- `LastName`
- `Email`
- `PasswordHash`
- `Role`
- `CreatedAt`
- `UpdatedAt`

### Tickets

Stores player-created 6/49 Lotto tickets. Each row represents one bet for one draw.

Suggested columns:

- `Id`
- `UserId`
- `RoundId`
- `Number1`
- `Number2`
- `Number3`
- `Number4`
- `Number5`
- `Number6`
- `CreatedAt`

### Rounds

Stores lottery rounds and winning numbers.

Suggested columns:

- `Id`
- `RoundNumber`
- `WinningNumber1`
- `WinningNumber2`
- `WinningNumber3`
- `WinningNumber4`
- `WinningNumber5`
- `WinningNumber6`
- `DrawnAt`

## Suggested API Endpoints

### Authentication

- `POST /users`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Profile

- `GET /api/profile`
- `PUT /api/profile`

### Tickets

- `POST /api/tickets`
- `GET /api/tickets/my`

### Draws

- `GET /api/rounds/drawn`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/rounds/play`

## Local Development

### Frontend

```bash
npm install
npm run dev
```

The React frontend runs on:

- `http://127.0.0.1:5173/registration`

By default, the registration form posts to:

- `http://localhost:5121/users`

Set `VITE_API_BASE_URL` if the API runs on a different URL.

### Backend

```bash
dotnet run --project backend/Lottery365.Api.csproj --launch-profile http
```

The ASP.NET Core API runs on:

- `http://localhost:5121`

The SQL Server connection string is configured in:

- `backend/appsettings.json`

## Frontend Pages

Recommended frontend routes:

- `/register`
- `/login`
- `/profile`
- `/compose-ticket`
- `/my-tickets`
- `/drawn-tickets`
- `/admin/users`
- `/admin/play-round`

## Business Rules

- A player must be logged in to create tickets.
- A ticket represents one 6/49 Lotto bet.
- A ticket must contain exactly 6 unique numbers.
- Ticket numbers must be between 1 and 49.
- A player can submit multiple tickets for the same draw.
- Only admins can access user management and round drawing pages.
- Each lottery round should have one set of winning numbers.
- Drawn winning numbers must be saved permanently in the database.

## Delivery Priorities

Because the job description emphasizes fast delivery and functionality over visual polish, the recommended implementation order is:

1. Backend project setup.
2. Database schema and migrations.
3. Authentication and role handling.
4. Player ticket creation and validation.
5. Player ticket history.
6. Admin round drawing.
7. Drawn ticket history.
8. Basic responsive frontend pages.
9. Final testing and cleanup.

## Minimum Acceptance Criteria

The project can be considered complete when:

- A player can register and log in.
- A player can edit profile information.
- A player can create a valid 6/49 Lotto ticket with 6 unique numbers from 1 to 49.
- A player can create multiple tickets for one draw.
- Invalid tickets are rejected.
- A player can view their saved tickets.
- An admin can view all users.
- An admin can generate the next round's winning numbers.
- Drawn winning numbers are saved in SQL.
- Users can view all drawn tickets.
- Admin pages are protected from non-admin users.
