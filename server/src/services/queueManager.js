const crypto = require('crypto');
const path = require('path');
const { DOWNLOAD_JOBS, jobQueue, processJobQueue } = require('./download');
const { SEPARATOR_JOBS, separatorQueue, processSeparatorQueue, checkIsInstalled } = require('./separator');
const { getSongCache } = require('./scanner');

/**
 * Creates one or more download jobs.
 * @param {Array<Object>|Object} requests 
 * @returns {Array<string>} Array of jobIds
 */
function addDownloadJobs(requests) {
    const list = Array.isArray(requests) ? requests : [requests];
    const jobIds = [];
    
    for (const reqItem of list) {
        const { usdbId, artist, title, videoMode, youtubeUrl, targetDir, safeName, skipAudio, audioFile } = reqItem;
        if (!artist || !title) continue;
        const mode = ['mp4', 'stream', 'none'].includes(videoMode) ? videoMode : 'none';
        const jobId = crypto.randomBytes(8).toString('hex');
        const job = {
            jobId,
            usdbId: usdbId || null,
            artist,
            title,
            videoMode: mode,
            youtubeUrl: youtubeUrl || null,
            targetDir: targetDir || null,
            safeName: safeName || null,
            skipAudio: !!skipAudio,
            audioFile: audioFile || null,
            status: 'pending',
            progress: 0,
            log: [],
            error: null
        };
        DOWNLOAD_JOBS.set(jobId, job);
        jobQueue.push(job);
        jobIds.push(jobId);
    }
    
    if (jobIds.length > 0) {
        processJobQueue();
    }
    return jobIds;
}

/**
 * Gets a summary list of all download jobs.
 * @returns {Array<Object>}
 */
function getDownloadJobsList() {
    return Array.from(DOWNLOAD_JOBS.values()).map(j => ({
        jobId: j.jobId,
        usdbId: j.usdbId,
        artist: j.artist,
        title: j.title,
        videoMode: j.videoMode,
        status: j.status,
        progress: j.progress,
        error: j.error,
        log: j.log
    }));
}

/**
 * Gets a specific download job by ID.
 * @param {string} jobId 
 * @returns {Object|null}
 */
function getDownloadJob(jobId) {
    return DOWNLOAD_JOBS.get(jobId) || null;
}

/**
 * Checks if the audio-separator tool is installed.
 * @returns {Promise<boolean>}
 */
async function checkSeparatorInstalled() {
    return await checkIsInstalled();
}

/**
 * Adds an installation job for the audio-separator.
 * @returns {string} jobId
 */
function addSeparatorInstallJob() {
    const jobId = crypto.randomBytes(8).toString('hex');
    const job = {
        jobId,
        type: 'install',
        status: 'pending',
        progress: 0,
        log: [],
        error: null
    };
    SEPARATOR_JOBS.set(jobId, job);
    separatorQueue.push(job);
    processSeparatorQueue();
    return jobId;
}

/**
 * Gets a summary list of all separator jobs.
 * @returns {Array<Object>}
 */
function getSeparatorJobsList() {
    return Array.from(SEPARATOR_JOBS.values()).map(j => ({
        jobId: j.jobId,
        type: j.type,
        status: j.status,
        progress: j.progress,
        error: j.error,
        log: j.log,
        safeName: j.safeName
    }));
}

/**
 * Gets a specific separator job by ID.
 * @param {string} jobId 
 * @returns {Object|null}
 */
function getSeparatorJob(jobId) {
    return SEPARATOR_JOBS.get(jobId) || null;
}

/**
 * Creates one or more separator jobs.
 * @param {Array<Object>|Object} requests 
 * @returns {Array<string>} Array of jobIds
 */
function addSeparatorJobs(requests) {
    const list = Array.isArray(requests) ? requests : [requests];
    const jobIds = [];
    
    for (const reqItem of list) {
        let { songId, songDir, audioFile, txtFile, safeName, type, approximateStartSec, isPaused } = reqItem;
        
        if (songId) {
            const song = getSongCache().find(s => s.id === songId);
            if (song && song.txtPath) {
                songDir = songDir || path.dirname(song.txtPath);
                txtFile = txtFile || path.basename(song.txtPath);
                safeName = safeName || song.title;
                if (song.audio) {
                    audioFile = audioFile || path.basename(song.audio.split('?')[0]);
                }
            }
        }

        if (!songId || !songDir || !audioFile) continue;
        
        const jobId = crypto.randomBytes(8).toString('hex');
        const job = {
            jobId,
            type: type || 'separate',
            songId,
            songDir,
            audioFile,
            txtFile,
            safeName,
            approximateStartSec,
            isPaused,
            status: 'pending',
            progress: 0,
            log: [],
            error: null
        };
        SEPARATOR_JOBS.set(jobId, job);
        separatorQueue.push(job);
        jobIds.push(jobId);
    }
    
    if (jobIds.length > 0) {
        processSeparatorQueue();
    }
    return jobIds;
}

module.exports = {
    addDownloadJobs,
    getDownloadJobsList,
    getDownloadJob,
    checkSeparatorInstalled,
    addSeparatorInstallJob,
    getSeparatorJobsList,
    getSeparatorJob,
    addSeparatorJobs
};
