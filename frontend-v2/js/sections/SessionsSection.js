import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { PipelinePoller } from '../core/poller.js';
import { Modal } from '../components/Modal.js';
import { Toast } from '../components/Toast.js';

export class SessionsSection {
    constructor(params) {
        this.appId = params.appId;
        this.sessions = [];
        this.application = null;
        this.pollers = new Map();
        this.disposed = false;
    }

    async fetchData() {
        try {
            if (this.appId) {
                sessionStorage.setItem('current_app_id', this.appId);
            }
            const [data, application] = await Promise.all([
                api.get(`/sessions?application_id=${this.appId}`),
                api.get(`/applications/${this.appId}`)
            ]);
            this.sessions = Array.isArray(data) ? data : [];
            this.application = application;
            if (application?.job_version_id) {
                sessionStorage.setItem('current_version_id', application.job_version_id);
            }
        } catch (error) {
            Toast.show(t('error'), 'error');
            this.sessions = [];
            this.application = null;
        }
    }

    _statusBadge(status, sessionId) {
        const colors = {
            pending:   'var(--warning)',
            running:   'var(--info)',
            completed: 'var(--success)',
            failed:    'var(--danger)'
        };
        const color = colors[status] || 'var(--text-muted)';
        
        let stopButton = '';
        if (status === 'running') {
            const isAr = localStorage.getItem('lang') === 'ar';
            stopButton = `
                <button class="btn btn-outline stop-pipeline-btn" data-id="${sessionId}"
                     style="padding: 0.15rem 0.4rem; font-size: 0.75rem; color: var(--danger); border-color: var(--danger); margin-left: 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;"
                     title="${isAr ? 'إيقاف الـ AI' : 'Stop AI Processing'}">
                     <i class="fas fa-stop"></i> ${isAr ? 'إيقاف' : 'Stop'}
                </button>
            `;
        }
        
        return `
            <div style="display: inline-flex; align-items: center;">
                <span style="background:${color};color:white;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.8rem;font-weight:600;">${status}</span>
                ${stopButton}
            </div>
        `;
    }

    render() {
        const backVersionId = this.application?.job_version_id || sessionStorage.getItem('current_version_id') || '';
        const backPath = backVersionId ? `/job-versions/${backVersionId}/applications` : '/jobs';
        let tableRows = '';
        if (this.sessions.length === 0) {
            tableRows = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
                <i class="fas fa-video-slash" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                No sessions yet. Create the first interview session!
            </td></tr>`;
        } else {
            tableRows = this.sessions.map(s => `
                <tr>
                    <td><strong>Session #${s.id}</strong></td>
                    <td>${s.session_type}</td>
                    <td data-session-status="${s.id}">${this._statusBadge(s.pipeline_status, s.id)}</td>
                    <td>
                        <button class="btn btn-outline upload-media-btn" data-id="${s.id}"
                            style="padding:0.2rem 0.5rem;font-size:0.8rem;" title="Upload Media">
                            <i class="fas fa-upload"></i> Upload Media
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-outline view-transcript-btn" data-id="${s.id}"
                            style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="View Transcript">
                            <i class="fas fa-file-invoice"></i>
                        </button>
                        <button class="btn btn-outline"
                            onclick="window.location.hash='/pipeline/runs/${s.id}'"
                            style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="View Pipeline">
                            <i class="fas fa-project-diagram"></i>
                        </button>
                        <button class="btn btn-outline"
                            onclick="window.location.hash='/sessions/${s.id}/evaluation'"
                            style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="View Evaluation">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="btn btn-outline delete-session-btn" data-id="${s.id}"
                            style="padding:0.3rem 0.6rem;color:var(--danger);border-color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        return `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <div>
                    <button class="btn btn-outline" onclick="window.location.hash='${backPath}'" style="margin-bottom:0.5rem;">
                        <i class="fas fa-arrow-left"></i> Back to Applications
                    </button>
                    <h1 style="color:var(--primary-color);">Interview Sessions</h1>
                    <p style="color:var(--text-muted);">Application #${this.appId}</p>
                </div>
                <button id="add-session-btn" class="btn btn-primary">
                    <i class="fas fa-plus"></i> New Session
                </button>
            </div>
            <div class="card table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Session</th>
                            <th>Type</th>
                            <th>Pipeline Status</th>
                            <th>Media</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="session-tbody">${tableRows}</tbody>
                </table>
            </div>
        `;
    }

    mount() {
        if (this.disposed) return;
        
        document.getElementById('add-session-btn').addEventListener('click', () => this._openForm());

        document.getElementById('session-tbody').addEventListener('click', (e) => {
            const del = e.target.closest('.delete-session-btn');
            const upload = e.target.closest('.upload-media-btn');
            const stop = e.target.closest('.stop-pipeline-btn');
            const viewTranscript = e.target.closest('.view-transcript-btn');
            
            if (del) this._deleteSession(del.dataset.id);
            if (upload) this._openUploadModal(upload.dataset.id);
            if (stop) this._stopPipeline(stop.dataset.id);
            if (viewTranscript) this._viewTranscript(viewTranscript.dataset.id);
        });

        this.sessions
            .filter((session) => session.pipeline_status === 'running')
            .forEach((session) => this._startPipelinePolling(session.id));
    }

    async _stopPipeline(id) {
        const isAr = localStorage.getItem('lang') === 'ar';
        if (!confirm(isAr ? 'هل أنت متأكد من إيقاف معالجة الـ AI لهذه الجلسة؟' : 'Are you sure you want to stop AI processing for this session?')) return;
        try {
            await api.post(`/sessions/${id}/stop`, {});
            Toast.show(isAr ? 'تم إيقاف معالجة الـ AI بنجاح' : 'AI processing stopped successfully', 'success');
            await this.refresh();
        } catch (e) {
            Toast.show(isAr ? 'خطأ في إيقاف المعالجة' : 'Error stopping AI processing', 'error');
        }
    }

    _formatTranscript(text) {
        if (!text || !text.trim()) return '<p style="color:var(--text-muted); font-style:italic;">No transcript text available.</p>';
        const lines = text.split('\n');
        return lines.map(line => {
            if (!line.trim()) return '';
            const match = line.match(/^([^:]+):(.*)$/);
            if (match) {
                const speaker = match[1].trim();
                const content = match[2].trim();
                const isInterviewer = speaker.toLowerCase().includes('interviewer') || speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('speaker 0');
                const bg = isInterviewer ? 'rgba(79, 70, 229, 0.05)' : 'rgba(16, 185, 129, 0.05)';
                const border = isInterviewer ? 'var(--primary-color)' : '#10b981';
                return `
                    <div style="background:${bg}; border-left: 3px solid ${border}; padding: 0.8rem; margin-bottom: 0.8rem; border-radius: 6px;">
                        <strong style="color:${border}; display:block; margin-bottom:0.25rem;">${speaker}</strong>
                        <span style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-color);">${content}</span>
                    </div>
                `;
            }
            return `<p style="white-space: pre-wrap; font-size: 0.95rem; color: var(--text-color); margin-bottom:0.5rem;">${line}</p>`;
        }).join('');
    }

    _viewTranscript(id) {
        const isAr = localStorage.getItem('lang') === 'ar';
        const session = this.sessions.find(s => s.id == id);
        if (!session) return;
        
        let contentHtml = '';
        
        if (session.pipeline_status === 'running') {
            contentHtml = `
                <div style="text-align:center; padding: 3rem; color: var(--info);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.1rem;">${isAr ? 'جاري تفريغ المقابلة نصياً في الخلفية...' : 'AI pipeline is running transcription...'}</p>
                </div>
            `;
        } else if (session.pipeline_status === 'pending') {
            contentHtml = `
                <div style="text-align:center; padding: 3rem; color: var(--warning);">
                    <i class="fas fa-clock" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.1rem;">${isAr ? 'قيد الانتظار لبدء التفريغ النصي...' : 'Pending transcription...'}</p>
                </div>
            `;
        } else if (session.pipeline_status === 'failed') {
             contentHtml = `
                <div style="text-align:center; padding: 3rem; color: var(--danger);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.1rem;">${isAr ? 'فشلت عملية التفريغ النصي للمقابلة.' : 'Transcription failed for this session.'}</p>
                </div>
            `;
        } else {
            const formatted = this._formatTranscript(session.full_transcript);
            contentHtml = `
                <div style="display:flex; justify-content:flex-end; margin-bottom: 1rem;">
                    <button class="btn btn-outline" id="session-copy-btn" style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">
                        <i class="fas fa-copy"></i> ${isAr ? 'نسخ النص' : 'Copy Transcript'}
                    </button>
                </div>
                <div style="max-height: 60vh; overflow-y: auto; background: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
                    ${formatted}
                </div>
            `;
        }
        
        const modal = new Modal({
            title: `${isAr ? 'النص المفرغ للجلسة' : 'Session Transcript'} #${session.id} (${session.session_type})`,
            content: contentHtml
        });
        
        modal.show();
        
        const closeBtn = modal.element.querySelector('.cancel-btn');
        if (closeBtn) closeBtn.textContent = isAr ? 'إغلاق' : 'Close';
        
        const copyBtn = modal.element.querySelector('#session-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(session.full_transcript || '');
                    Toast.show(isAr ? 'تم نسخ النص بنجاح!' : 'Transcript copied to clipboard!', 'success');
                } catch (err) {
                    Toast.show(isAr ? 'فشل نسخ النص' : 'Failed to copy', 'error');
                }
            });
        }
    }

    _openForm() {
        const content = `
            <div class="form-group">
                <label class="form-label">Session Type</label>
                <select id="sess-type" class="form-control">
                    <option value="screening">Screening</option>
                    <option value="technical">Technical</option>
                    <option value="cultural_fit">Cultural Fit</option>
                    <option value="final">Final</option>
                </select>
            </div>
        `;
        const modal = new Modal({
            title: 'Create Interview Session',
            content,
            saveText: 'Create',
            onSave: async (modalEl) => {
                try {
                    await api.post('/sessions', {
                        application_id: parseInt(this.appId),
                        session_type: modalEl.querySelector('#sess-type').value
                    });
                    Toast.show('Session created!', 'success');
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || 'Error creating session', 'error');
                    throw e;
                }
            }
        });
        modal.show();
    }

    _openUploadModal(id) {
        const isAr = localStorage.getItem('lang') === 'ar';
        const content = `
            <div class="tabs" style="display:flex; border-bottom:1px solid var(--border-color); margin-bottom:1.5rem;">
                <button class="tab-btn active" data-tab="upload" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:3px solid var(--primary-color); color:var(--primary-color); font-weight:bold; cursor:pointer; font-size:1rem; transition:all 0.2s;"><i class="fas fa-upload"></i> ${isAr ? 'رفع ملف' : 'Upload File'}</button>
                <button class="tab-btn" data-tab="record" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:3px solid transparent; color:var(--text-muted); font-weight:bold; cursor:pointer; font-size:1rem; transition:all 0.2s;"><i class="fas fa-video"></i> ${isAr ? 'تسجيل الآن' : 'Record Now'}</button>
                <button class="tab-btn" data-tab="link" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:3px solid transparent; color:var(--text-muted); font-weight:bold; cursor:pointer; font-size:1rem; transition:all 0.2s;"><i class="fas fa-link"></i> ${isAr ? 'ربط رابط' : 'Link Download'}</button>
            </div>

            <div id="tab-upload" class="tab-content">
                <div class="form-group">
                    <label class="form-label">${isAr ? 'تسجيل المقابلة (MP3 / WAV / MP4 / WEBM / TXT)' : 'Interview Recording (MP3 / WAV / MP4 / WEBM / TXT)'}</label>
                    <input type="file" id="media-file" class="form-control" accept=".mp3,.wav,.mp4,.webm,.m4a,.txt">
                    <small style="display:block;margin-top:0.5rem;color:var(--text-muted);">
                        <i class="fas fa-info-circle"></i>
                        ${isAr ? 'بعد الرفع، تبدأ معالجة الـ AI تلقائياً.' : 'After upload, the AI pipeline starts automatically in the background.'}
                    </small>
                </div>
            </div>

            <div id="tab-record" class="tab-content" style="display:none; text-align:center;">
                <div style="margin-bottom:1.5rem; display:flex; justify-content:center; gap:2rem;">
                    <label style="cursor:pointer; font-weight:600;"><input type="radio" name="record-source" value="mic" checked> <i class="fas fa-microphone-alt"></i> ${isAr ? 'صوت الميكروفون' : 'Microphone'}</label>
                    <label style="cursor:pointer; font-weight:600;"><input type="radio" name="record-source" value="system"> <i class="fas fa-desktop"></i> ${isAr ? 'الشاشة وصوت النظام' : 'Screen & System Audio'}</label>
                </div>
                <div id="record-timer" style="font-size:2.5rem; font-weight:bold; color:var(--danger); margin-bottom:1rem; font-variant-numeric:tabular-nums; display:none;">00:00</div>
                <div style="display:flex; justify-content:center; gap:1rem;">
                    <button type="button" id="start-record-btn" class="btn btn-primary" style="border-radius:50px; padding:0.6rem 1.8rem; font-size:1rem;"><i class="fas fa-circle" style="color:#ff4d4f;"></i> ${isAr ? 'بدء التسجيل' : 'Start Recording'}</button>
                    <button type="button" id="stop-record-btn" class="btn btn-outline" style="border-radius:50px; padding:0.6rem 1.8rem; display:none; color:var(--danger); border-color:var(--danger); font-size:1rem;"><i class="fas fa-stop"></i> ${isAr ? 'إيقاف التسجيل' : 'Stop Recording'}</button>
                </div>
                <div id="record-status" style="margin-top:1rem; color:var(--text-muted); font-size:0.95rem; min-height:1.5rem;"></div>
                
                <!-- Media Previews -->
                <video id="record-preview-video" controls style="margin-top:1.5rem; width:100%; max-height:250px; display:none; border-radius:10px; background:#000;"></video>
                <audio id="record-preview-audio" controls style="margin-top:1.5rem; width:100%; display:none; border-radius:30px;"></audio>
                
                <div id="submit-hint" style="display:none; margin-top:1rem; padding:1rem; background-color:rgba(0, 200, 83, 0.1); border:1px solid var(--success); border-radius:10px; color:var(--success); font-weight:bold;">
                    ${isAr ? 'تم الحفظ مؤقتاً! يرجى الضغط على الزر الأخضر بالأسفل (إرسال وبدء الـ AI) ليتم رفعه للنظام.' : 'Saved temporarily! Please click the green Submit button below to upload it to the system.'}
                </div>

                <!-- Record Auto-delete option -->
                <div style="margin-top: 1.5rem; display: flex; justify-content: center; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none; text-align: left;">
                        <div style="position: relative; width: 44px; height: 24px; flex-shrink: 0;">
                            <input type="checkbox" id="record-auto-delete" checked style="opacity: 0; width: 0; height: 0; position: absolute;">
                            <span id="record-slider" style="
                                position: absolute; inset: 0; border-radius: 24px;
                                background: var(--danger); transition: background 0.25s, border-color 0.25s;
                                border: 1px solid var(--danger);
                                cursor: pointer;
                            "></span>
                            <span id="record-knob" style="
                                position: absolute; left: 3px; top: 3px;
                                width: 16px; height: 16px; border-radius: 50%;
                                background: white; transition: transform 0.25s;
                                transform: translateX(20px);
                                pointer-events: none;
                            "></span>
                        </div>
                        <div>
                            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-color); display: block;">
                                ${isAr ? 'حذف التسجيل تلقائياً بعد النسخ' : 'Auto-delete recording after transcription'}
                            </span>
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.1rem;">
                                ${isAr ? 'سيتم مسح الملف الصوتي من السيرفر فور انتهاء النسخ النصي بنجاح.' : 'Clears the audio/video file from server storage once transcription succeeds.'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            <div id="tab-link" class="tab-content" style="display:none;">
                <div class="form-group">
                    <label class="form-label">${isAr ? 'رابط المقابلة (YouTube, Google Drive, Vimeo, direct link)' : 'Interview URL (YouTube, Google Drive, Vimeo, direct link)'}</label>
                    <input type="url" id="media-url" class="form-control" placeholder="https://www.youtube.com/watch?v=...">
                    <small style="display:block;margin-top:0.5rem;color:var(--text-muted);">
                        <i class="fas fa-info-circle"></i>
                        ${isAr ? 'يدعم روابط يوتيوب، جوجل درايف، فيميو، تيك توك، والروابط المباشرة لملفات الصوت والفيديو.' : 'Supports YouTube, Google Drive, Vimeo, TikTok, and direct video/audio files.'}
                    </small>
                </div>
                <!-- Link Auto-delete option -->
                <div style="margin-top: 1.5rem; display: flex; justify-content: center; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 0.75rem; cursor: pointer; user-select: none; text-align: left;">
                        <div style="position: relative; width: 44px; height: 24px; flex-shrink: 0;">
                            <input type="checkbox" id="link-auto-delete" checked style="opacity: 0; width: 0; height: 0; position: absolute;">
                            <span id="link-slider" style="
                                position: absolute; inset: 0; border-radius: 24px;
                                background: var(--danger); transition: background 0.25s, border-color 0.25s;
                                border: 1px solid var(--danger);
                                cursor: pointer;
                            "></span>
                            <span id="link-knob" style="
                                position: absolute; left: 3px; top: 3px;
                                width: 16px; height: 16px; border-radius: 50%;
                                background: white; transition: transform 0.25s;
                                transform: translateX(20px);
                                pointer-events: none;
                            "></span>
                        </div>
                        <div>
                            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-color); display: block;">
                                ${isAr ? 'حذف الملف تلقائياً بعد النسخ' : 'Auto-delete downloaded file after transcription'}
                            </span>
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 0.1rem;">
                                ${isAr ? 'سيتم مسح الملف من السيرفر فور انتهاء النسخ النصي بنجاح.' : 'Clears the audio/video file from server storage once transcription succeeds.'}
                            </span>
                        </div>
                    </label>
                </div>
            </div>
        `;

        let mediaRecorder = null;
        let audioChunks = [];
        let recordInterval = null;
        let recordSeconds = 0;
        let recordBlob = null;
        let stream = null;
        let currentSource = 'mic';

        const modal = new Modal({
            title: isAr ? 'إضافة وسائط المقابلة' : 'Add Interview Media',
            content,
            saveText: isAr ? 'إرسال وبدء الـ AI' : 'Submit & Start AI',
            onSave: async (modalEl) => {
                const activeTab = modalEl.querySelector('.tab-btn.active').dataset.tab;
                const formData = new FormData();

                if (activeTab === 'upload') {
                    const fileInput = modalEl.querySelector('#media-file');
                    if (!fileInput.files.length) {
                        Toast.show(isAr ? 'الرجاء تحديد ملف' : 'Please select a file', 'error');
                        throw new Error('No file');
                    }
                    formData.append('file', fileInput.files[0]);
                } else if (activeTab === 'record') {
                    if (mediaRecorder && mediaRecorder.state === 'recording') {
                        Toast.show(isAr ? 'الرجاء إيقاف التسجيل أولاً' : 'Please stop recording first', 'error');
                        throw new Error('Still recording');
                    }
                    if (!recordBlob) {
                        Toast.show(isAr ? 'لا يوجد تسجيل لإرساله' : 'No recording to submit', 'error');
                        throw new Error('No recording');
                    }
                    // If video, save as .webm. If audio, save as .webm
                    const ext = currentSource === 'system' ? 'webm' : 'webm';
                    formData.append('file', recordBlob, `recording.${ext}`);
                } else if (activeTab === 'link') {
                    const urlInput = modalEl.querySelector('#media-url');
                    const urlVal = urlInput.value.trim();
                    if (!urlVal) {
                        Toast.show(isAr ? 'الرجاء إدخال رابط صالح' : 'Please enter a valid URL', 'error');
                        throw new Error('No URL');
                    }
                }

                try {
                    let autoDelete = false;
                    let response;
                    if (activeTab === 'upload') {
                        autoDelete = true;
                        const uploadUrl = `/sessions/${id}/upload?auto_delete_media=${autoDelete}`;
                        response = await api.post(uploadUrl, formData);
                    } else if (activeTab === 'record') {
                        autoDelete = modalEl.querySelector('#record-auto-delete')?.checked ?? false;
                        const uploadUrl = `/sessions/${id}/upload?auto_delete_media=${autoDelete}`;
                        response = await api.post(uploadUrl, formData);
                    } else if (activeTab === 'link') {
                        autoDelete = modalEl.querySelector('#link-auto-delete')?.checked ?? false;
                        const urlInput = modalEl.querySelector('#media-url');
                        const urlVal = urlInput.value.trim();
                        Toast.show(isAr ? 'جاري تحميل ومعالجة الرابط، قد يستغرق ذلك بضع دقائق...' : 'Downloading and processing media from URL, this may take a few minutes...', 'info');
                        const uploadUrl = `/sessions/${id}/upload-url?url=${encodeURIComponent(urlVal)}&auto_delete_media=${autoDelete}`;
                        response = await api.post(uploadUrl, {});
                    }

                    Toast.show(
                        autoDelete
                            ? (isAr ? 'تم الإرسال! سيتم حذف الملف بعد النسخ.' : 'Submitted! File will be deleted after transcription.')
                            : (isAr ? 'تم الإرسال بنجاح! معالجة الـ AI تعمل في الخلفية.' : 'Submitted successfully! AI processing started.'),
                        'success'
                    );
                    this._startPipelinePolling(id);
                    await this.refresh();
                } catch (e) {
                    Toast.show(e.message || 'Error uploading', 'error');
                    throw e;
                } finally {
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                }
            }
        });

        // Setup UI Logic for Tabs
        const tabBtns = modal.element.querySelectorAll('.tab-btn');
        const tabContents = modal.element.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                tabBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.borderBottomColor = 'transparent';
                    b.style.color = 'var(--text-muted)';
                });
                e.currentTarget.classList.add('active');
                e.currentTarget.style.borderBottomColor = 'var(--primary-color)';
                e.currentTarget.style.color = 'var(--primary-color)';
                
                tabContents.forEach(tc => tc.style.display = 'none');
                modal.element.querySelector('#tab-' + tab).style.display = 'block';
            });
        });

        // Setup UI Logic for Recording
        const startBtn = modal.element.querySelector('#start-record-btn');
        const stopBtn = modal.element.querySelector('#stop-record-btn');
        const timerEl = modal.element.querySelector('#record-timer');
        const statusEl = modal.element.querySelector('#record-status');
        const previewVideo = modal.element.querySelector('#record-preview-video');
        const previewAudio = modal.element.querySelector('#record-preview-audio');
        const submitHint = modal.element.querySelector('#submit-hint');

        const updateTimer = () => {
            const m = String(Math.floor(recordSeconds / 60)).padStart(2, '0');
            const s = String(recordSeconds % 60).padStart(2, '0');
            timerEl.textContent = m + ':' + s;
        };

        startBtn.addEventListener('click', async () => {
            currentSource = modal.element.querySelector('input[name="record-source"]:checked').value;
            try {
                let mimeType = '';
                if (currentSource === 'system') {
                    // System audio requires getDisplayMedia (user must check "Share system audio" in browser dialog)
                    stream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            cursor: "always"
                        },
                        audio: true
                    });
                    mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus') ? 'video/webm; codecs=vp8,opus' : 'video/webm';
                } else {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
                }

                audioChunks = [];
                mediaRecorder = new MediaRecorder(stream, { mimeType });

                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const finalMime = currentSource === 'system' ? 'video/webm' : mimeType;
                    recordBlob = new Blob(audioChunks, { type: finalMime });
                    
                    const objUrl = URL.createObjectURL(recordBlob);
                    if (currentSource === 'system') {
                        previewVideo.src = objUrl;
                        previewVideo.style.display = 'block';
                        previewAudio.style.display = 'none';
                    } else {
                        previewAudio.src = objUrl;
                        previewAudio.style.display = 'block';
                        previewVideo.style.display = 'none';
                    }
                    
                    statusEl.textContent = isAr ? 'انتهى التسجيل.' : 'Recording finished.';
                    statusEl.style.color = 'var(--success)';
                    submitHint.style.display = 'block'; // Show the hint to click Submit
                    
                    if (stream) stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start(1000); // 1-second chunks
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-flex';
                timerEl.style.display = 'block';
                previewVideo.style.display = 'none';
                previewAudio.style.display = 'none';
                submitHint.style.display = 'none';
                recordBlob = null;
                recordSeconds = 0;
                updateTimer();
                statusEl.textContent = isAr ? 'جاري التسجيل...' : 'Recording...';
                statusEl.style.color = 'var(--danger)';

                recordInterval = setInterval(() => {
                    recordSeconds++;
                    updateTimer();
                }, 1000);

                // If user stops sharing screen externally via the browser's floating bar
                if (currentSource === 'system') {
                    stream.getVideoTracks().forEach(track => {
                        track.onended = () => {
                            if (mediaRecorder && mediaRecorder.state === 'recording') stopBtn.click();
                        };
                    });
                }

            } catch (err) {
                console.error(err);
                statusEl.textContent = (isAr ? 'فشل بدء التسجيل: ' : 'Failed to start: ') + err.message;
                statusEl.style.color = 'var(--danger)';
            }
        });

        stopBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            clearInterval(recordInterval);
            startBtn.style.display = 'inline-flex';
            startBtn.innerHTML = '<i class="fas fa-redo"></i> ' + (isAr ? 'إعادة التسجيل' : 'Record Again');
            stopBtn.style.display = 'none';
        });

        // Clean up when modal closes
        const oldClose = modal.close.bind(modal);
        modal.close = () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
            clearInterval(recordInterval);
            if (stream) stream.getTracks().forEach(track => track.stop());
            oldClose();
        };

        modal.show();

        // Wire up record auto-delete slider switch
        const recordToggle = modal.element.querySelector('#record-auto-delete');
        const recordSlider = modal.element.querySelector('#record-slider');
        const recordKnob   = modal.element.querySelector('#record-knob');
        if (recordToggle && recordSlider && recordKnob) {
            const updateToggleVisual = () => {
                if (recordToggle.checked) {
                    recordSlider.style.background = 'var(--danger)';
                    recordSlider.style.borderColor = 'var(--danger)';
                    recordKnob.style.transform = 'translateX(20px)';
                } else {
                    recordSlider.style.background = 'var(--border-color)';
                    recordSlider.style.borderColor = 'var(--border-color)';
                    recordKnob.style.transform = 'translateX(0)';
                }
            };
            recordToggle.addEventListener('change', updateToggleVisual);
            // Initial styling sync
            updateToggleVisual();
        }

        // Wire up link auto-delete slider switch
        const linkToggle = modal.element.querySelector('#link-auto-delete');
        const linkSlider = modal.element.querySelector('#link-slider');
        const linkKnob   = modal.element.querySelector('#link-knob');
        if (linkToggle && linkSlider && linkKnob) {
            const updateLinkToggleVisual = () => {
                if (linkToggle.checked) {
                    linkSlider.style.background = 'var(--danger)';
                    linkSlider.style.borderColor = 'var(--danger)';
                    linkKnob.style.transform = 'translateX(20px)';
                } else {
                    linkSlider.style.background = 'var(--border-color)';
                    linkSlider.style.borderColor = 'var(--border-color)';
                    linkKnob.style.transform = 'translateX(0)';
                }
            };
            linkToggle.addEventListener('change', updateLinkToggleVisual);
            // Initial styling sync
            updateLinkToggleVisual();
        }
    }

    _startPipelinePolling(id) {
        if (this.disposed) return;
        const key = String(id);
        if (this.pollers.has(key)) {
            this.pollers.get(key).stop();
        }

        const poller = new PipelinePoller(id, {
            onUpdate: (status) => {
                if (this.disposed) return;
                const cell = document.querySelector(`[data-session-status="${id}"]`);
                if (cell) {
                    cell.innerHTML = this._statusBadge(status.status, id);
                }
            },
            onComplete: async () => {
                if (this.disposed) return;
                this.pollers.delete(key);
                await this.refresh();
            },
            onError: (error) => {
                if (this.disposed) return;
                Toast.show(error.message || 'Pipeline status polling failed', 'error');
            }
        });

        this.pollers.set(key, poller);
        poller.start();
    }

    async _deleteSession(id) {
        if (!confirm('Delete this session?')) return;
        try {
            await api.fetch(`/sessions/${id}`, { method: 'DELETE' });
            Toast.show('Session deleted', 'success');
            await this.refresh();
        } catch {
            Toast.show('Error deleting session', 'error');
        }
    }

    destroy() {
        this.disposed = true;
        for (const poller of this.pollers.values()) {
            poller.stop();
        }
        this.pollers.clear();
    }

    async refresh() {
        if (this.disposed || window.location.hash !== `#/applications/${this.appId}/sessions`) {
            this.destroy();
            return;
        }
        await this.fetchData();
        if (this.disposed || window.location.hash !== `#/applications/${this.appId}/sessions`) {
            this.destroy();
            return;
        }
        document.getElementById('app-content').innerHTML = this.render();
        this.mount();
    }
}
