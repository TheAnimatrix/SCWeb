import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Re-use or define validation logic server-side
function validateServerForm(formData: FormData): Record<string, string> {
    const errors: Record<string, string> = {};
    const name = formData.get('name') as string ?? '';
    const contactNumber = formData.get('contactNumber') as string ?? '';
    const email = formData.get('email') as string ?? '';
    const maxPrinterSize = formData.get('maxPrinterSize') as string ?? '';
    const numPrinters = parseInt(formData.get('numPrinters') as string ?? '1', 10);
    const selectedFilaments = formData.getAll('selectedFilaments'); // Gets all values with this name

    // --- Name Validation ---
    const trimmedName = name.trim();
    if (!trimmedName) {
        errors.name = 'Name is required.';
    } else if (trimmedName.length < 3) {
        errors.name = 'Name must be at least 3 characters long.';
    } else if (trimmedName.length > 45) {
        errors.name = 'Name must be no more than 45 characters long.';
    } else if (!/^[A-Za-z ]+$/.test(trimmedName)) {
        errors.name = 'Name must contain only letters (A-Z, a-z) and spaces.';
    }

    // --- Contact Number Validation ---
    if (!contactNumber.trim()) {
        errors.contactNumber = 'Contact number is required.';
    } else if (!/^[6-9]\d{9}$/.test(contactNumber)) {
        errors.contactNumber = 'Please enter a valid 10-digit Indian mobile number.';
    }

    // --- Email Validation ---
    if (!email.trim()) {
        errors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please enter a valid email address.';
    }

    // --- Max Printer Size Validation ---
    let maxDimensionValue: number | null = null;
    if (!maxPrinterSize.trim()) {
        errors.maxPrinterSize = 'Max printer build area is required.';
    } else {
        const match = maxPrinterSize.match(/^(\d+)[xX](\d+)$/);
        if (!match) {
            errors.maxPrinterSize = 'Format must be WidthxDepth (e.g., 220x220). Use numbers only.';
        } else {
            const width = parseInt(match[1], 10);
            const depth = parseInt(match[2], 10);
            const minDimension = 50;
            const maxDimension = 1500;

            if (isNaN(width) || isNaN(depth)) {
                errors.maxPrinterSize = 'Invalid dimensions. Please use numbers.';
            } else if (width < minDimension || depth < minDimension) {
                errors.maxPrinterSize = `Dimensions seem too small. Must be at least ${minDimension}x${minDimension} mm.`;
            } else if (width > maxDimension || depth > maxDimension) {
                errors.maxPrinterSize = `Dimensions seem too large. Cannot exceed ${maxDimension}x${maxDimension} mm.`;
            } else {
                // Store the largest dimension for the bigint column
                maxDimensionValue = Math.max(width, depth);
            }
        }
    }

    // --- Number of Printers Validation ---
    if (isNaN(numPrinters) || numPrinters < 1) {
        errors.numPrinters = 'Number of printers must be at least 1.';
    }

    // --- Selected Filaments Validation ---
    if (!selectedFilaments || selectedFilaments.length === 0) {
        errors.selectedFilaments = 'Please select at least one filament type.';
    }

    return errors;
}


export const actions: Actions = {
    default: async ({ request, locals: { supabase, supabaseServer } }) => {
        // Fetch the user fresh inside the action
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Authentication Error:', authError);
            // Or redirect to login
            return fail(401, { message: 'User not authenticated or session expired.' });
        }

        const formData = await request.formData();
        const name = formData.get('name') as string ?? '';
        const contactNumber = formData.get('contactNumber') as string ?? '';
        const email = formData.get('email') as string ?? '';
        const maxPrinterSize = formData.get('maxPrinterSize') as string ?? '';
        const numPrinters = parseInt(formData.get('numPrinters') as string ?? '1', 10);
        // Get all selected filament values
        const selectedFilaments = formData.getAll('selectedFilaments') as string[];

        const errors = validateServerForm(formData);



        if (Object.keys(errors).length > 0) {
            return fail(400, {
                errors,
                name,
                contactNumber,
                email,
                maxPrinterSize,
                numPrinters: isNaN(numPrinters) ? 1 : numPrinters, // Send back valid number or default
                selectedFilaments // Send back the selections
            });
        }

        // Prepare data for Supabase using the freshly fetched user ID
        const makerData = {
            maker_id: user.id, // Use ID from the fetched user object
            name: name.trim(),
            contact_number: '+91' + contactNumber.trim(), // Add country code
            email: email.trim(),
            max_printer_size: maxPrinterSize, // Store the largest dimension
            number_of_printers: numPrinters,
            filament_types: selectedFilaments, // Store as array of text
            approved_state: 'pending' // Default state
            // filament_data might need separate handling if you collect more details
        };

        try {
            const { error: dbError } = await supabaseServer
                .from('PrintingCrafters')
                .insert(makerData);

            if (dbError) {
                console.error('Supabase DB Error:', dbError);
                // Provide more specific feedback if possible, e.g., duplicate entry
                let userMessage = 'Failed to submit application due to a database error.';
                if (dbError.code === '23505') { // Unique violation (e.g., maker_id already exists)
                   userMessage = 'You have already submitted an application.';
                   // Optionally, redirect or show a specific state instead of just an error
                   // For now, return fail to show the message on the form page
                    return fail(409, { // 409 Conflict
                       message: userMessage,
                       name, contactNumber, email, maxPrinterSize, numPrinters, selectedFilaments
                   });
                }
                 return fail(500, {
                    message: userMessage,
                    errors: { general: userMessage }, // Add a general error field
                    name, contactNumber, email, maxPrinterSize, numPrinters, selectedFilaments
                });
            }

            // Success! Return success state. The page will react to this.
            return { success: true };

        } catch (e) {
            console.error('Server Error:', e);
            const message = 'An unexpected server error occurred.';
            return fail(500, {
                 message: message,
                 errors: { general: message },
                 name, contactNumber, email, maxPrinterSize, numPrinters, selectedFilaments
            });
        }
    }
};

// Optional: If you need to load data specifically for this page (beyond layout data)
// export const load: PageServerLoad = async ({ locals: { supabaseServer, session } }) => {
//     // Load additional data if needed
//     return {};
// };