document.addEventListener('DOMContentLoaded', async () => {
  const lcpVal = document.getElementById('lcp-val');
  const lcpIndicator = document.getElementById('lcp-indicator');
  const clsVal = document.getElementById('cls-val');
  const clsIndicator = document.getElementById('cls-indicator');
  const fidVal = document.getElementById('fid-val');
  const fidIndicator = document.getElementById('fid-indicator');
  const errorsCard = document.getElementById('errors-card');
  const errorCount = document.getElementById('error-count');
  const triggerAuditBtn = document.getElementById('trigger-audit');

  // Query active tab metrics
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    const tabId = tabs[0].id;
    const url = tabs[0].url;

    // Send a message to content script to get metrics
    chrome.tabs.sendMessage(tabId, { action: 'get_metrics' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Could not reach content script (might be a system page).");
        return;
      }
      if (response && response.metrics) {
        updateUI(response.metrics, response.errors || []);
      }
    });
  });

  function updateUI(metrics, errors) {
    // Update LCP
    if (metrics.lcp) {
      const lcpSec = (metrics.lcp / 1000).toFixed(2);
      lcpVal.innerText = `${lcpSec}s`;
      lcpIndicator.className = 'status-badge';
      if (metrics.lcp <= 2500) {
        lcpIndicator.classList.add('status-green');
      } else if (metrics.lcp <= 4000) {
        lcpIndicator.classList.add('status-amber');
      } else {
        lcpIndicator.classList.add('status-red');
      }
    }

    // Update CLS
    if (metrics.cls !== undefined) {
      clsVal.innerText = metrics.cls.toFixed(3);
      clsIndicator.className = 'status-badge';
      if (metrics.cls <= 0.1) {
        clsIndicator.classList.add('status-green');
      } else if (metrics.cls <= 0.25) {
        clsIndicator.classList.add('status-amber');
      } else {
        clsIndicator.classList.add('status-red');
      }
    }

    // Update FID
    if (metrics.fid) {
      fidVal.innerText = `${metrics.fid.toFixed(0)}ms`;
      fidIndicator.className = 'status-badge';
      if (metrics.fid <= 100) {
        fidIndicator.classList.add('status-green');
      } else if (metrics.fid <= 300) {
        fidIndicator.classList.add('status-amber');
      } else {
        fidIndicator.classList.add('status-red');
      }
    } else {
      // Fallback: estimate using FCP or DOMContentLoaded if FID not triggered
      if (metrics.fcp) {
        fidVal.innerText = `~${(metrics.fcp * 0.05).toFixed(0)}ms`;
        fidIndicator.className = 'status-badge status-green';
      }
    }

    // Update Errors
    if (errors && errors.length > 0) {
      errorsCard.style.display = 'flex';
      errorCount.innerText = `${errors.length} Error${errors.length > 1 ? 's' : ''} Detected`;
    } else {
      errorsCard.style.display = 'none';
    }
  }

  // Trigger Audit Button
  triggerAuditBtn.addEventListener('click', async () => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs[0]) return;
      const tabUrl = tabs[0].url;
      
      triggerAuditBtn.innerText = "Auditing Page...";
      triggerAuditBtn.disabled = true;

      try {
        const response = await fetch('http://localhost:8000/api/audit/repo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            repo_path: "simulated_repo",
            target_url: tabUrl
          })
        });
        const data = await response.json();
        
        // Open the dashboard to view results
        chrome.tabs.create({ url: `http://localhost:5173/auditor?report_id=${data.id || ''}` });
      } catch (err) {
        console.error("Failed to run page audit:", err);
        alert("Failed to connect to backend server. Make sure FastAPI server is running on http://localhost:8000");
      } finally {
        triggerAuditBtn.innerText = "Audit Current Page Code";
        triggerAuditBtn.disabled = false;
      }
    });
  });
});
