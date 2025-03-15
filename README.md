# Selfcrafted Web Application

![Selfcrafted Logo](static/images/favicon.png)

## Overview

Selfcrafted is a web application designed to provide users with an engaging and interactive experience. The platform allows users to explore crafts, learn about the company, start crafting processes, manage their user profiles, and view their shopping carts.

## API Routes

- **GET /api/crafts**: Retrieve a list of available crafts.
- **POST /api/orders**: Create a new order.
- **GET /api/user/profile**: Get user profile information.
- **PUT /api/user/profile**: Update user profile information.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/TheAnimatrix/SCWeb.git
    cd SCWeb
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Set up environment variables:

    - Create a `.env` file in the root directory.
    - Add your Supabase URL and public API key:

        ```
        VITE_SUPABASE_URL=your-supabase-url
        VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
        ```

4. Start the development server:

    ```bash
    npm run dev
    ```

5. Open your browser and navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your forked repository.
5. Submit a pull request to the main repository.

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0). See the [LICENSE](LICENSE) file for details.

---
