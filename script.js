document.getElementById('url-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const urlInput = document.getElementById('url-input');
    const url = urlInput.value;

    const response = await fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
    });

    const data = await response.json();
    displayResults(data, url);
});

// New event listener for summarizing privacy policy
document.getElementById('summarize-button').addEventListener('click', async () => {
    const policyInput = document.getElementById('policy-input');
    const policyText = policyInput.value;

    const response = await fetch('/summarize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ policy: policyText })
    });

    const data = await response.json();
    displaySummary(data);
});

function displayResults(data, url) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results

    if (data.error) {
        resultsDiv.innerHTML = `<p>${data.error}</p>`;
        return;
    }

    const tooltipDescriptions = {
        necessary: "Necessary cookies enable essential features like secure log-in and consent preferences. They do not store personal data.",
        analytics: "Analytical cookies help us understand how visitors interact with our site, providing metrics like visitor count and bounce rate.",
        functional: "Functional cookies allow specific features like social media sharing and collecting feedback from users.",
        performance: "Performance cookies help analyze key performance metrics to enhance user experience.",
        advertisement: "Advertisement cookies deliver tailored ads based on previous site visits and measure ad effectiveness.",
        other: "Other cookies are uncategorized cookies that are still being analyzed."
    };

    resultsDiv.innerHTML += `<h3>Types of Cookies:</h3>`;

    for (const [key, count] of Object.entries(data.cookieCounts)) {
        resultsDiv.innerHTML += `
            <div class="cookie-count">
                <span>${key.charAt(0).toUpperCase() + key.slice(1)}: ${count}</span>
                <span class="icon" tabindex="0">
                    <ion-icon name="information-circle-outline"></ion-icon>
                    <span class="tooltip">${tooltipDescriptions[key]}</span>
                </span>
            </div>`;
    }

    const urlObj = new URL(url);
    const websiteName = urlObj.hostname.replace('www.', '').split('.')[0];
    const formattedName = websiteName.charAt(0).toUpperCase() + websiteName.slice(1);

    resultsDiv.innerHTML += `<h2>Cookie statistics for ${formattedName}</h2>`;
    resultsDiv.innerHTML += `<p>Total number of cookies: ${data.totalCookies}</p>`;

    const chartData = {
        labels: ['Necessary', 'Analytics', 'Functional', 'Performance', 'Advertisement', 'Other'],
        datasets: [{
            label: 'Number of Cookies',
            data: [
                data.cookieCounts.necessary,
                data.cookieCounts.analytics,
                data.cookieCounts.functional,
                data.cookieCounts.performance,
                data.cookieCounts.advertisement,
                data.cookieCounts.other
            ],
            backgroundColor: [
                'rgba(75, 192, 192, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 99, 132, 0.2)',
                'rgba(255, 159, 64, 0.2)',
                'rgba(201, 203, 207, 0.2)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(201, 203, 207, 1)'
            ],
            borderWidth: 1
        }]
    };

    const ctx = document.createElement('canvas');
    ctx.width = 400;
    ctx.height = 200;
    resultsDiv.appendChild(ctx);
    const myChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Cookie Count by Type'
                }
            }
        }
    });
}

// New function to display structured summary
function displaySummary(data) {
    const summaryDiv = document.getElementById('summary-result');
    summaryDiv.innerHTML = ''; // Clear previous summary

    if (data.error) {
        summaryDiv.innerHTML = `<p>${data.error}</p>`;
        return;
    }

    // Generalized regex to match any "Pros" and "Cons" section
    const prosMatch = data.summary.match(/Pros:\*\*(.*?)Cons:\*\*/s);
    const consMatch = data.summary.match(/Cons:\*\*(.*)/s);

    const pros = prosMatch ? prosMatch[1].trim().split(' * ').filter(item => item) : [];
    const cons = consMatch ? consMatch[1].trim().split(' * ').filter(item => item) : [];

    // Create the pros and cons lists
    summaryDiv.innerHTML = `<h3>Privacy Policy Summary:</h3>`;

    if (pros.length > 0) {
        summaryDiv.innerHTML += `<h4>Pros:</h4><ul>`;
        pros.forEach(pro => {
            summaryDiv.innerHTML += `<li>${pro}</li>`;
        });
        summaryDiv.innerHTML += `</ul>`;
    }

    if (cons.length > 0) {
        summaryDiv.innerHTML += `<h4>Cons:</h4><ul>`;
        cons.forEach(con => {
            summaryDiv.innerHTML += `<li>${con}</li>`;
        });
        summaryDiv.innerHTML += `</ul>`;
    }
}

