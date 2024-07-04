// orders.js

function getStatusWidth(status) {
    // Define the width for each status
    const statusWidths = {
        0: '25%', // Pending
        1: '50%', // Shipped
        2: '75%', // Delivered
        3: '100%' // Canceled
    };

    // Return the width based on the status
    return statusWidths[status] || '0%'; // Default width if status is invalid
}
