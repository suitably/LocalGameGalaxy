const queueManager = require('../services/queueManager');

/**
 * Initiates USDB and YouTube video download jobs.
 */
function downloadUsdb(req, res) {
    try {
        const jobIds = queueManager.addDownloadJobs(req.body);
        if (jobIds.length === 0) {
            return res.status(400).json({ error: 'No valid jobs provided' });
        }
        res.json({ jobIds });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * Returns the full list of USDB download jobs.
 */
function getUsdbJobs(req, res) {
    res.json(queueManager.getDownloadJobsList());
}

/**
 * Returns the current status and logs of a specific USDB download job.
 */
function getUsdbJobStatus(req, res) {
    const job = queueManager.getDownloadJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ status: job.status, progress: job.progress, log: job.log.slice(-30), error: job.error });
}

/**
 * Returns whether the audio-separator Python tools are installed.
 */
async function getSeparatorInstalledStatus(req, res) {
    try {
        const isInstalled = await queueManager.checkSeparatorInstalled();
        res.json({ installed: isInstalled });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * Starts a job to install the audio-separator Python package and whisper dependencies.
 */
async function installSeparator(req, res) {
    try {
        const isInstalled = await queueManager.checkSeparatorInstalled();
        if (isInstalled) return res.json({ success: true, message: 'Already installed' });
        
        const jobId = queueManager.addSeparatorInstallJob();
        res.json({ jobId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

/**
 * Returns the list of all separator jobs.
 */
function getSeparatorJobs(req, res) {
    res.json(queueManager.getSeparatorJobsList());
}

/**
 * Returns status and logs for a specific audio separation job.
 */
function getSeparatorJobStatus(req, res) {
    const job = queueManager.getSeparatorJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ status: job.status, progress: job.progress, log: job.log.slice(-30), error: job.error });
}

/**
 * Creates one or more audio separation jobs for a song.
 */
function createSeparatorJob(req, res) {
    try {
        const jobIds = queueManager.addSeparatorJobs(req.body);
        if (jobIds.length === 0) {
            return res.status(400).json({ error: 'No valid jobs provided' });
        }
        res.json({ jobIds });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = {
    downloadUsdb,
    getUsdbJobs,
    getUsdbJobStatus,
    getSeparatorInstalledStatus,
    installSeparator,
    getSeparatorJobs,
    getSeparatorJobStatus,
    createSeparatorJob
};
