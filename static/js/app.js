// ============================================================
// APLIKASI WEBSITE TULIP
// ============================================================

"use strict";


// ============================================================
// 01 — PENGATURAN API
// ============================================================

const API = {
    publicOptions: "/api/public/options",
    handover: "/api/transactions/handover",
    transactions: "/api/transactions",
    login: "/api/auth/login",
    myAccount: "/api/auth/me",
    logout: "/api/auth/logout",
    dashboard: "/api/dashboard",
    adminUsers: "/api/admin/users",
    proofUpload: "/api/proofs",
    files: "/api/files"
};

const TOKEN_KEY = "tulip_access_token";

const getElement = (id) =>
    document.getElementById(id);


// ============================================================
// 02 — DAFTAR HALAMAN
// ============================================================

const pages = {
    landing:
        getElement("landingPage"),

    handover:
        getElement("handoverPage"),

    success:
        getElement("handoverSuccessPage"),

    login:
        getElement("loginPage"),

    application:
        getElement("applicationPage")
};

let currentUser = null;
let publicOptions = null;
let notificationTimer = null;


// ============================================================
// 03 — MENJALANKAN APLIKASI
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initializeApplication
);


async function initializeApplication() {
    setCurrentYear();
    installEvents();

    if (getToken()) {
        await restoreSession();
    } else {
        showPage("landing");
    }
}


// ============================================================
// 04 — MEMASANG SELURUH EVENT
// ============================================================

function installEvents() {
    getElement("openHandoverButton")
        ?.addEventListener(
            "click",
            openHandover
        );

    getElement("openLoginButton")
        ?.addEventListener(
            "click",
            function () {
                showPage("login");

                getElement("username")
                    ?.focus();
            }
        );

    getElement("backFromHandoverButton")
        ?.addEventListener(
            "click",
            function () {
                showPage("landing");
            }
        );

    getElement("backFromLoginButton")
        ?.addEventListener(
            "click",
            function () {
                showPage("landing");
            }
        );

    getElement("backToLandingButton")
        ?.addEventListener(
            "click",
            function () {
                resetHandoverForm();
                showPage("landing");
            }
        );

    getElement(
        "createAnotherHandoverButton"
    )?.addEventListener(
        "click",
        function () {
            resetHandoverForm();
            showPage("handover");
        }
    );

    getElement("unit")
        ?.addEventListener(
            "change",
            handleUnitChange
        );

    document
        .querySelectorAll(
            ".quantity-input"
        )
        .forEach(
            function (input) {
                input.addEventListener(
                    "input",
                    calculateTotal
                );
            }
        );

    getElement("handoverPhoto")
        ?.addEventListener(
            "change",
            showSelectedHandoverFile
        );

    getElement("handoverForm")
        ?.addEventListener(
            "submit",
            submitHandover
        );

    getElement("loginForm")
        ?.addEventListener(
            "submit",
            login
        );

    getElement("togglePasswordButton")
        ?.addEventListener(
            "click",
            togglePassword
        );

    getElement("logoutButton")
        ?.addEventListener(
            "click",
            logout
        );

    getElement("notificationCloseButton")
        ?.addEventListener(
            "click",
            hideNotification
        );

    getElement(
        "dashboardNavigationButton"
    )?.addEventListener(
        "click",
        showDashboardView
    );

    getElement(
        "userManagementNavigationButton"
    )?.addEventListener(
        "click",
        showUserManagementView
    );

    getElement("refreshDashboardButton")
        ?.addEventListener(
            "click",
            loadDashboard
        );

    getElement("dashboardFilterForm")
        ?.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                loadDashboard();
            }
        );

    getElement(
        "resetDashboardFilterButton"
    )?.addEventListener(
        "click",
        function () {
            getElement(
                "dashboardFilterForm"
            )?.reset();

            loadDashboard();
        }
    );

    getElement("transactionTableBody")
        ?.addEventListener(
            "click",
            handleTransactionAction
        );
}


// ============================================================
// 05 — PERPINDAHAN HALAMAN
// ============================================================

function showPage(pageName) {
    Object.values(pages).forEach(
        function (page) {
            if (page) {
                page.hidden = true;
            }
        }
    );

    if (pages[pageName]) {
        pages[pageName].hidden = false;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// 06 — MEMBUKA FORM PENYERAHAN
// ============================================================

async function openHandover() {
    showPage("handover");

    if (!publicOptions) {
        await loadPublicOptions();
    }
}


// ============================================================
// 07 — MENGAMBIL PILIHAN FORM
// ============================================================

async function loadPublicOptions() {
    const branchSelect =
        getElement("branchId");

    const unitSelect =
        getElement("unit");

    if (branchSelect) {
        branchSelect.disabled = true;
    }

    if (unitSelect) {
        unitSelect.disabled = true;
    }

    try {
        const response = await fetch(
            API.publicOptions
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Pilihan formulir gagal dimuat."
                )
            );
        }

        publicOptions = data;

        fillSelect(
            branchSelect,
            data.branches,
            "Pilih lokasi/cabang",
            "id",
            "name"
        );

        fillSelect(
            unitSelect,
            data.units,
            "Pilih unit kerja"
        );

        fillSelect(
            getElement(
                "operationSubunit"
            ),
            data.operation_subunits,
            "Pilih sub-unit Operation"
        );

        fillDashboardBranchFilter();

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        if (branchSelect) {
            branchSelect.disabled = false;
        }

        if (unitSelect) {
            unitSelect.disabled = false;
        }
    }
}


// ============================================================
// 08 — MEMASUKKAN DATA KE SELECT
// ============================================================

function fillSelect(
    selectElement,
    items,
    placeholder,
    valueKey = null,
    labelKey = null
) {
    if (!selectElement) {
        return;
    }

    selectElement.innerHTML = "";

    const defaultOption =
        document.createElement("option");

    defaultOption.value = "";
    defaultOption.textContent =
        placeholder;

    selectElement.appendChild(
        defaultOption
    );

    (items || []).forEach(
        function (item) {
            const option =
                document.createElement(
                    "option"
                );

            if (valueKey && labelKey) {
                option.value =
                    item[valueKey];

                option.textContent =
                    item[labelKey];
            } else {
                option.value = item;
                option.textContent = item;
            }

            selectElement.appendChild(
                option
            );
        }
    );
}


// ============================================================
// 09 — SUB-UNIT OPERATION
// ============================================================

function handleUnitChange() {
    const operationSelected =
        getElement("unit").value ===
        "Operation";

    getElement(
        "operationSubunitGroup"
    ).hidden =
        !operationSelected;

    getElement(
        "operationSubunit"
    ).required =
        operationSelected;

    if (!operationSelected) {
        getElement(
            "operationSubunit"
        ).value = "";
    }
}


// ============================================================
// 10 — PERHITUNGAN TOTAL
// ============================================================

function getQuantity(id) {
    const value = Number(
        getElement(id)?.value || 0
    );

    if (
        !Number.isInteger(value) ||
        value < 0
    ) {
        return 0;
    }

    return value;
}


function calculateTotal() {
    const total =
        getQuantity("qty100") * 100 +
        getQuantity("qty200") * 200 +
        getQuantity("qty500") * 500 +
        getQuantity("qty1000") * 1000;

    if (getElement("totalAmount")) {
        getElement(
            "totalAmount"
        ).textContent =
            formatRupiah(total);
    }

    return total;
}


function formatRupiah(value) {
    return new Intl.NumberFormat(
        "id-ID",
        {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value) || 0
    );
}


// ============================================================
// 11 — NAMA FILE PENYERAHAN
// ============================================================

function showSelectedHandoverFile() {
    const file =
        getElement("handoverPhoto")
            ?.files?.[0];

    getElement(
        "handoverFileName"
    ).textContent =
        file
            ? file.name
            : "Belum ada foto dipilih";
}


// ============================================================
// 12 — MENYIMPAN PENYERAHAN
// ============================================================

async function submitHandover(event) {
    event.preventDefault();

    const total = calculateTotal();

    if (total <= 0) {
        showNotification(
            "Masukkan minimal satu pecahan uang logam.",
            "error"
        );

        return;
    }

    const photo =
        getElement("handoverPhoto")
            ?.files?.[0];

    if (!photo) {
        showNotification(
            "Foto bukti penyerahan wajib dipilih.",
            "error"
        );

        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (
        !allowedTypes.includes(
            photo.type
        )
    ) {
        showNotification(
            "Foto harus JPG, PNG, atau WEBP.",
            "error"
        );

        return;
    }

    setHandoverLoading(true);

    try {
        const formData =
            new FormData(
                getElement(
                    "handoverForm"
                )
            );

        const response = await fetch(
            API.handover,
            {
                method: "POST",
                body: formData
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Penyerahan gagal disimpan."
                )
            );
        }

        showHandoverSuccess(
            data.transaction
        );

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        setHandoverLoading(false);
    }
}


// ============================================================
// 13 — STATUS FORM PENYERAHAN
// ============================================================

function setHandoverLoading(loading) {
    getElement(
        "submitHandoverButton"
    ).disabled =
        loading;

    getElement(
        "submitHandoverText"
    ).hidden =
        loading;

    getElement(
        "submitHandoverLoading"
    ).hidden =
        !loading;
}


function showHandoverSuccess(
    transaction
) {
    getElement(
        "successTransactionId"
    ).textContent =
        transaction.id;

    getElement(
        "successEmployeeName"
    ).textContent =
        transaction.employee_name;

    getElement(
        "successBranch"
    ).textContent =
        transaction.branch;

    getElement(
        "successTotalAmount"
    ).textContent =
        formatRupiah(
            transaction.total_amount
        );

    getElement(
        "successStatus"
    ).textContent =
        transaction.status;

    showPage("success");
}


function resetHandoverForm() {
    getElement(
        "handoverForm"
    )?.reset();

    [
        "qty100",
        "qty200",
        "qty500",
        "qty1000"
    ].forEach(
        function (id) {
            if (getElement(id)) {
                getElement(id).value = 0;
            }
        }
    );

    getElement(
        "operationSubunitGroup"
    ).hidden = true;

    getElement(
        "operationSubunit"
    ).required = false;

    getElement(
        "handoverFileName"
    ).textContent =
        "Belum ada foto dipilih";

    calculateTotal();
}


// ============================================================
// 14 — LOGIN
// ============================================================

async function login(event) {
    event.preventDefault();

    const username =
        getElement("username")
            .value
            .trim()
            .toLowerCase();

    const password =
        getElement("password").value;

    if (!username || !password) {
        showNotification(
            "Username dan password harus diisi.",
            "error"
        );

        return;
    }

    setLoginLoading(true);

    try {
        const response = await fetch(
            API.login,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Login gagal."
                )
            );
        }

        localStorage.setItem(
            TOKEN_KEY,
            data.access_token
        );

        getElement(
            "password"
        ).value = "";

        showAuthenticatedPage(
            data.user
        );

        showNotification(
            "Login berhasil.",
            "success"
        );

    } catch (error) {
        localStorage.removeItem(
            TOKEN_KEY
        );

        showNotification(
            error.message,
            "error"
        );

    } finally {
        setLoginLoading(false);
    }
}


// ============================================================
// 15 — STATUS LOGIN
// ============================================================

function setLoginLoading(loading) {
    getElement(
        "loginButton"
    ).disabled =
        loading;

    getElement(
        "loginButtonText"
    ).hidden =
        loading;

    getElement(
        "loginLoading"
    ).hidden =
        !loading;

    getElement(
        "username"
    ).disabled =
        loading;

    getElement(
        "password"
    ).disabled =
        loading;
}


// ============================================================
// 16 — MEMULIHKAN SESI
// ============================================================

async function restoreSession() {
    try {
        const response = await fetch(
            API.myAccount,
            {
                headers:
                    authorizationHeaders()
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                "Sesi sudah berakhir."
            );
        }

        showAuthenticatedPage(data);

    } catch (error) {
        localStorage.removeItem(
            TOKEN_KEY
        );

        showPage("landing");
    }
}


// ============================================================
// 17 — MENAMPILKAN AKUN
// ============================================================

function showAuthenticatedPage(user) {
    currentUser = user;

    getElement(
        "currentUserName"
    ).textContent =
        user.name ||
        user.username;

    getElement(
        "currentUserInformation"
    ).textContent =
        buildUserInformation(user);

    document.body.dataset.userRole =
        user.role || "";

    document.body.dataset.branchId =
        user.branch_id || "";

    showPage("application");

    configureDashboard(user);
    showDashboardView();
    loadDashboard();
}


function buildUserInformation(user) {
    const roleName =
        getRoleName(user.role);

    if (user.branch_name) {
        return (
            roleName +
            " • " +
            user.branch_name
        );
    }

    return roleName;
}


function getRoleName(role) {
    const roleNames = {
        SUPERADMIN: "Superadmin",
        HQ: "Pusat",
        BRANCH_HEAD: "Kepala Cabang"
    };

    return roleNames[role] || role;
}


// ============================================================
// 18 — LOGOUT
// ============================================================

async function logout() {
    const button =
        getElement("logoutButton");

    button.disabled = true;
    button.textContent = "Keluar...";

    try {
        if (getToken()) {
            await fetch(
                API.logout,
                {
                    method: "POST",
                    headers:
                        authorizationHeaders()
                }
            );
        }

    } catch (error) {
        console.error(error);

    } finally {
        localStorage.removeItem(
            TOKEN_KEY
        );

        currentUser = null;

        delete document.body.dataset
            .userRole;

        delete document.body.dataset
            .branchId;

        getElement(
            "loginForm"
        )?.reset();

        button.disabled = false;
        button.textContent = "Keluar";

        showPage("landing");

        showNotification(
            "Anda berhasil keluar.",
            "success"
        );
    }
}


// ============================================================
// 19 — TAMPILAN PASSWORD
// ============================================================

function togglePassword() {
    const passwordInput =
        getElement("password");

    const isHidden =
        passwordInput.type ===
        "password";

    passwordInput.type =
        isHidden
            ? "text"
            : "password";

    getElement(
        "togglePasswordButton"
    ).textContent =
        isHidden
            ? "Sembunyikan"
            : "Lihat";
}


// ============================================================
// 20 — PENGATURAN DASHBOARD
// ============================================================

function configureDashboard(user) {
    const canSeeAllBranches =
        user.role === "HQ" ||
        user.role === "SUPERADMIN";

    getElement(
        "filterBranchGroup"
    ).hidden =
        !canSeeAllBranches;

    getElement(
        "userManagementNavigationButton"
    ).hidden =
        user.role !== "SUPERADMIN";

    if (canSeeAllBranches) {
        if (!publicOptions) {
            loadPublicOptions();
        } else {
            fillDashboardBranchFilter();
        }
    }
}


function fillDashboardBranchFilter() {
    const select =
        getElement("filterBranchId");

    if (!select || !publicOptions) {
        return;
    }

    const selectedValue =
        select.value;

    select.innerHTML = "";

    const allOption =
        document.createElement("option");

    allOption.value = "";
    allOption.textContent =
        "Semua cabang";

    select.appendChild(allOption);

    publicOptions.branches.forEach(
        function (branch) {
            const option =
                document.createElement(
                    "option"
                );

            option.value = branch.id;
            option.textContent =
                branch.name;

            select.appendChild(option);
        }
    );

    select.value = selectedValue;
}


// ============================================================
// 21 — NAVIGASI DASHBOARD
// ============================================================

function showDashboardView() {
    getElement(
        "dashboardView"
    ).hidden = false;

    getElement(
        "userManagementView"
    ).hidden = true;

    getElement(
        "dashboardNavigationButton"
    ).classList.add("active");

    getElement(
        "userManagementNavigationButton"
    ).classList.remove("active");
}


async function showUserManagementView() {
    if (
        !currentUser ||
        currentUser.role !== "SUPERADMIN"
    ) {
        return;
    }

    getElement(
        "dashboardView"
    ).hidden = true;

    getElement(
        "userManagementView"
    ).hidden = false;

    getElement(
        "dashboardNavigationButton"
    ).classList.remove("active");

    getElement(
        "userManagementNavigationButton"
    ).classList.add("active");

    await loadAdminUsers();
}


// ============================================================
// 22 — MEMUAT DASHBOARD
// ============================================================

async function loadDashboard() {
    const tableBody =
        getElement(
            "transactionTableBody"
        );

    if (!getToken() || !tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td
                class="empty-table"
                colspan="7"
            >
                Memuat data transaksi...
            </td>
        </tr>
    `;

    const parameters =
        new URLSearchParams();

    const startDate =
        getElement(
            "filterStartDate"
        )?.value;

    const endDate =
        getElement(
            "filterEndDate"
        )?.value;

    const employeeName =
        getElement(
            "filterEmployeeName"
        )?.value.trim();

    const branchId =
        getElement(
            "filterBranchId"
        )?.value;

    if (startDate) {
        parameters.set(
            "start_date",
            startDate
        );
    }

    if (endDate) {
        parameters.set(
            "end_date",
            endDate
        );
    }

    if (employeeName) {
        parameters.set(
            "employee_name",
            employeeName
        );
    }

    if (branchId) {
        parameters.set(
            "branch_id",
            branchId
        );
    }

    try {
        const query =
            parameters.toString();

        const url = query
            ? (
                API.dashboard +
                "?" +
                query
            )
            : API.dashboard;

        const response = await fetch(
            url,
            {
                headers:
                    authorizationHeaders()
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (response.status === 401) {
            handleExpiredSession();
            return;
        }

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Dashboard gagal dimuat."
                )
            );
        }

        renderDashboard(data);

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td
                    class="empty-table"
                    colspan="7"
                >
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;

        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// 23 — MENAMPILKAN RINGKASAN
// ============================================================

function renderDashboard(data) {
    const description =
        data.user.branch
            ? (
                "Data transaksi cabang " +
                data.user.branch
            )
            : "Data transaksi seluruh cabang";

    getElement(
        "dashboardDescription"
    ).textContent =
        description;

    getElement(
        "summaryTransactionCount"
    ).textContent =
        data.summary.transaction_count;

    getElement(
        "summaryTotalAmount"
    ).textContent =
        formatRupiah(
            data.summary.total_amount
        );

    getElement(
        "summaryPaidAmount"
    ).textContent =
        formatRupiah(
            data.summary.paid_amount
        );

    getElement(
        "summaryPendingAmount"
    ).textContent =
        formatRupiah(
            data.summary.pending_amount
        );

    renderDenomination(
        data.denomination
    );

    getElement(
        "transactionTableInformation"
    ).textContent =
        data.transactions.length +
        " transaksi ditemukan";

    renderTransactions(
        data.transactions
    );
}


function renderDenomination(data) {
    [
        100,
        200,
        500,
        1000
    ].forEach(
        function (denomination) {
            getElement(
                "denominationQty" +
                denomination
            ).textContent =
                data[
                    "qty" +
                    denomination
                ] +
                " keping";

            getElement(
                "denominationAmount" +
                denomination
            ).textContent =
                formatRupiah(
                    data[
                        "amount" +
                        denomination
                    ]
                );
        }
    );
}


// ============================================================
// 24 — MENAMPILKAN TRANSAKSI
// ============================================================

function renderTransactions(
    transactions
) {
    const tableBody =
        getElement(
            "transactionTableBody"
        );

    if (!transactions.length) {
        tableBody.innerHTML = `
            <tr>
                <td
                    class="empty-table"
                    colspan="7"
                >
                    Belum ada transaksi.
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML =
        transactions
            .map(createTransactionRow)
            .join("");
}


function createTransactionRow(
    transaction
) {
    const paid =
        transaction.status ===
        "SUDAH DIGANTI";

    const operationSubunit =
        transaction.operation_subunit
            ? (
                " • " +
                escapeHtml(
                    transaction
                        .operation_subunit
                )
            )
            : "";

    const transferButton =
        transaction.has_transfer_proof
            ? `
                <button
                    type="button"
                    class="table-action-button"
                    data-action="view-proof"
                    data-proof="transfer"
                    data-id="${escapeHtml(
                        transaction.id
                    )}"
                >
                    Bukti Transfer
                </button>
            `
            : "";

    const uploadButton =
        currentUser?.role ===
            "BRANCH_HEAD" &&
        !transaction.has_transfer_proof
            ? `
                <button
                    type="button"
                    class="
                        table-action-button
                        table-action-button-primary
                    "
                    data-action="upload-transfer"
                    data-id="${escapeHtml(
                        transaction.id
                    )}"
                >
                    Upload Transfer
                </button>
            `
            : "";

    const canDelete =
        currentUser?.role === "HQ" ||
        currentUser?.role ===
            "SUPERADMIN";

    const deleteButton =
        canDelete
            ? `
                <button
                    type="button"
                    class="
                        table-action-button
                        table-action-button-danger
                    "
                    data-action="delete-transaction"
                    data-id="${escapeHtml(
                        transaction.id
                    )}"
                >
                    Hapus
                </button>
            `
            : "";

    return `
        <tr>
            <td>
                <strong
                    class="table-primary-text"
                >
                    ${escapeHtml(
                        transaction.id
                    )}
                </strong>

                <span
                    class="table-secondary-text"
                >
                    ${formatJakartaDate(
                        transaction.timestamp
                    )}
                </span>
            </td>

            <td>
                <strong
                    class="table-primary-text"
                >
                    ${escapeHtml(
                        transaction.employee_name
                    )}
                </strong>

                <span
                    class="table-secondary-text"
                >
                    NIK:
                    ${escapeHtml(
                        transaction.employee_nik
                    )}
                </span>
            </td>

            <td>
                <strong
                    class="table-primary-text"
                >
                    ${escapeHtml(
                        transaction.branch
                    )}
                </strong>

                <span
                    class="table-secondary-text"
                >
                    ${escapeHtml(
                        transaction.unit
                    )}
                    ${operationSubunit}
                </span>
            </td>

            <td>
                <span
                    class="table-secondary-text"
                >
                    Rp100:
                    ${transaction.qty100}
                    |
                    Rp200:
                    ${transaction.qty200}
                </span>

                <span
                    class="table-secondary-text"
                >
                    Rp500:
                    ${transaction.qty500}
                    |
                    Rp1.000:
                    ${transaction.qty1000}
                </span>
            </td>

            <td>
                <strong>
                    ${formatRupiah(
                        transaction.total_amount
                    )}
                </strong>
            </td>

            <td>
                <span class="
                    status-badge
                    ${
                        paid
                            ? "status-paid"
                            : "status-pending"
                    }
                ">
                    ${escapeHtml(
                        transaction.status
                    )}
                </span>
            </td>

            <td>
                <div class="table-actions">
                    <button
                        type="button"
                        class="table-action-button"
                        data-action="view-proof"
                        data-proof="handover"
                        data-id="${escapeHtml(
                            transaction.id
                        )}"
                    >
                        Bukti Penyerahan
                    </button>

                    ${transferButton}
                    ${uploadButton}
                    ${deleteButton}
                </div>
            </td>
        </tr>
    `;
}


// ============================================================
// 25 — TINDAKAN TRANSAKSI
// ============================================================

async function handleTransactionAction(
    event
) {
    const button =
        event.target.closest(
            "button[data-action]"
        );

    if (!button) {
        return;
    }

    const action =
        button.dataset.action;

    const transactionId =
        button.dataset.id;

    if (!transactionId) {
        return;
    }

    if (action === "view-proof") {
        await openProof(
            transactionId,
            button.dataset.proof
        );

        return;
    }

    if (action === "upload-transfer") {
        selectTransferProof(
            transactionId,
            button
        );

        return;
    }

    if (
        action ===
        "delete-transaction"
    ) {
        await deleteTransaction(
            transactionId,
            button
        );
    }
}


// ============================================================
// 25A — MENGHAPUS TRANSAKSI
// ============================================================

async function deleteTransaction(
    transactionId,
    sourceButton
) {
    const canDelete =
        currentUser?.role === "HQ" ||
        currentUser?.role ===
            "SUPERADMIN";

    if (!canDelete) {
        showNotification(
            "Anda tidak memiliki akses untuk menghapus transaksi.",
            "error"
        );

        return;
    }

    const confirmation =
        window.confirm(
            "Hapus transaksi " +
            transactionId +
            "?\n\n" +
            "Data transaksi, foto penyerahan, " +
            "dan bukti transfer akan dihapus permanen."
        );

    if (!confirmation) {
        return;
    }

    const originalText =
        sourceButton.textContent;

    sourceButton.disabled = true;

    sourceButton.textContent =
        "Menghapus...";

    try {
        const url =
            API.transactions +
            "/" +
            encodeURIComponent(
                transactionId
            );

        const response = await fetch(
            url,
            {
                method: "DELETE",
                headers:
                    authorizationHeaders()
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (
            response.status === 401
        ) {
            handleExpiredSession();
            return;
        }

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Transaksi gagal dihapus."
                )
            );
        }

        showNotification(
            data.message ||
            "Transaksi berhasil dihapus.",
            "success"
        );

        await loadDashboard();

    } catch (error) {
        sourceButton.disabled = false;

        sourceButton.textContent =
            originalText;

        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// 26 — MEMILIH BUKTI TRANSFER
// ============================================================

function selectTransferProof(
    transactionId,
    sourceButton
) {
    const fileInput =
        document.createElement("input");

    fileInput.type = "file";

    fileInput.accept = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ].join(",");

    fileInput.addEventListener(
        "change",
        async function () {
            const file =
                fileInput.files?.[0];

            if (!file) {
                return;
            }

            await uploadTransferProof(
                transactionId,
                file,
                sourceButton
            );
        }
    );

    fileInput.click();
}


// ============================================================
// 27 — UPLOAD BUKTI TRANSFER
// ============================================================

async function uploadTransferProof(
    transactionId,
    file,
    sourceButton
) {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];

    if (
        !allowedTypes.includes(
            file.type
        )
    ) {
        showNotification(
            "Bukti transfer harus JPG, PNG, WEBP, atau PDF.",
            "error"
        );

        return;
    }

    const confirmation =
        window.confirm(
            "Upload bukti transfer untuk transaksi " +
            transactionId +
            "?"
        );

    if (!confirmation) {
        return;
    }

    const originalText =
        sourceButton.textContent;

    sourceButton.disabled = true;
    sourceButton.textContent =
        "Mengunggah...";

    try {
        const formData =
            new FormData();

        formData.append(
            "transfer_file",
            file
        );

        const url =
            API.proofUpload +
            "/" +
            encodeURIComponent(
                transactionId
            ) +
            "/transfer";

        const response = await fetch(
            url,
            {
                method: "POST",
                headers:
                    authorizationHeaders(),
                body: formData
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (response.status === 401) {
            handleExpiredSession();
            return;
        }

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Bukti transfer gagal diunggah."
                )
            );
        }

        showNotification(
            data.message ||
            "Bukti transfer berhasil disimpan.",
            "success"
        );

        await loadDashboard();

    } catch (error) {
        sourceButton.disabled = false;
        sourceButton.textContent =
            originalText;

        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// 28 — MELIHAT BUKTI TRANSAKSI
// ============================================================

async function openProof(
    transactionId,
    proofType
) {
    const previewWindow =
        window.open("", "_blank");

    try {
        const url =
            API.files +
            "/" +
            encodeURIComponent(
                transactionId
            ) +
            "/" +
            proofType;

        const response = await fetch(
            url,
            {
                headers:
                    authorizationHeaders()
            }
        );

        if (!response.ok) {
            const data =
                await readJsonResponse(
                    response
                );

            throw new Error(
                getErrorMessage(
                    data,
                    "Bukti tidak dapat dibuka."
                )
            );
        }

        const blob =
            await response.blob();

        const objectUrl =
            URL.createObjectURL(blob);

        if (previewWindow) {
            previewWindow.location.href =
                objectUrl;
        } else {
            window.open(
                objectUrl,
                "_blank"
            );
        }

        setTimeout(
            function () {
                URL.revokeObjectURL(
                    objectUrl
                );
            },
            60000
        );

    } catch (error) {
        if (previewWindow) {
            previewWindow.close();
        }

        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// 29 — DAFTAR AKUN SUPERADMIN
// ============================================================

async function loadAdminUsers() {
    const tableBody =
        getElement("userTableBody");

    tableBody.innerHTML = `
        <tr>
            <td
                class="empty-table"
                colspan="6"
            >
                Memuat daftar pengguna...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            API.adminUsers,
            {
                headers:
                    authorizationHeaders()
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Daftar akun gagal dimuat."
                )
            );
        }

        if (!data.length) {
            tableBody.innerHTML = `
                <tr>
                    <td
                        class="empty-table"
                        colspan="6"
                    >
                        Belum ada akun.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML =
            data
                .map(createUserRow)
                .join("");

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td
                    class="empty-table"
                    colspan="6"
                >
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;

        showNotification(
            error.message,
            "error"
        );
    }
}


function createUserRow(user) {
    return `
        <tr>
            <td>
                <strong>
                    ${escapeHtml(
                        user.username
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(user.name)}
            </td>

            <td>
                ${escapeHtml(
                    getRoleName(user.role)
                )}
            </td>

            <td>
                ${escapeHtml(
                    user.branch_name || "-"
                )}
            </td>

            <td>
                <span class="
                    status-badge
                    ${
                        user.active
                            ? "status-active"
                            : "status-inactive"
                    }
                ">
                    ${
                        user.active
                            ? "AKTIF"
                            : "TIDAK AKTIF"
                    }
                </span>
            </td>

            <td>
                <span class="table-secondary-text">
                    Pengaturan akun akan
                    diaktifkan berikutnya.
                </span>
            </td>
        </tr>
    `;
}


// ============================================================
// 30 — TOKEN DAN HEADER
// ============================================================

function getToken() {
    return localStorage.getItem(
        TOKEN_KEY
    );
}


function authorizationHeaders() {
    return {
        Authorization:
            "Bearer " +
            getToken()
    };
}


function handleExpiredSession() {
    localStorage.removeItem(
        TOKEN_KEY
    );

    currentUser = null;

    showPage("login");

    showNotification(
        "Sesi telah berakhir. Silakan login kembali.",
        "error"
    );
}


// ============================================================
// 31 — MEMBACA RESPONSE API
// ============================================================

async function readJsonResponse(
    response
) {
    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    if (
        contentType.includes(
            "application/json"
        )
    ) {
        return await response.json();
    }

    return {};
}


function getErrorMessage(
    data,
    fallback
) {
    if (
        data &&
        typeof data.detail === "string"
    ) {
        return data.detail;
    }

    if (
        data &&
        Array.isArray(data.detail)
    ) {
        return data.detail
            .map(
                function (item) {
                    return (
                        item.msg ||
                        "Data tidak valid."
                    );
                }
            )
            .join(" ");
    }

    if (
        data &&
        typeof data.message === "string"
    ) {
        return data.message;
    }

    return fallback;
}


// ============================================================
// 32 — FORMAT TANGGAL JAKARTA
// ============================================================

function formatJakartaDate(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "id-ID",
        {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(
        new Date(value)
    );
}


// ============================================================
// 33 — KEAMANAN TEKS HTML
// ============================================================

function escapeHtml(value) {
    const element =
        document.createElement("div");

    element.textContent =
        value == null
            ? ""
            : String(value);

    return element.innerHTML;
}


// ============================================================
// 34 — NOTIFIKASI
// ============================================================

function showNotification(
    message,
    type
) {
    if (notificationTimer) {
        clearTimeout(
            notificationTimer
        );
    }

    getElement(
        "notificationMessage"
    ).textContent =
        message;

    getElement(
        "notification"
    ).className =
        "notification " +
        (type || "");

    getElement(
        "notification"
    ).hidden = false;

    notificationTimer =
        setTimeout(
            hideNotification,
            5000
        );
}


function hideNotification() {
    getElement(
        "notification"
    ).hidden = true;

    if (notificationTimer) {
        clearTimeout(
            notificationTimer
        );

        notificationTimer = null;
    }
}


// ============================================================
// 35 — TAHUN FOOTER
// ============================================================

function setCurrentYear() {
    document
        .querySelectorAll(
            ".current-year"
        )
        .forEach(
            function (element) {
                element.textContent =
                    new Date().getFullYear();
            }
        );
}

// ============================================================
// DOWNLOAD DATA TRANSAKSI KE EXCEL
// ============================================================

async function downloadTransactionsExcel() {
    const downloadButton =
        document.getElementById(
            "downloadExcelButton"
        );

    const token =
        localStorage.getItem(
            "tulip_access_token"
        );

    if (!token) {
        showNotification(
            "Sesi login tidak ditemukan. Silakan login kembali.",
            "error"
        );

        return;
    }

    const parameters =
        new URLSearchParams();

    const startDateInput =
        document.getElementById(
            "filterStartDate"
        );

    const endDateInput =
        document.getElementById(
            "filterEndDate"
        );

    const employeeNameInput =
        document.getElementById(
            "filterEmployeeName"
        );

    const branchInput =
        document.getElementById(
            "filterBranchId"
        );

    const startDate =
        startDateInput
            ? startDateInput.value
            : "";

    const endDate =
        endDateInput
            ? endDateInput.value
            : "";

    const employeeName =
        employeeNameInput
            ? employeeNameInput.value.trim()
            : "";

    const branchId =
        branchInput
            ? branchInput.value
            : "";

    if (startDate) {
        parameters.set(
            "start_date",
            startDate
        );
    }

    if (endDate) {
        parameters.set(
            "end_date",
            endDate
        );
    }

    if (employeeName) {
        parameters.set(
            "employee_name",
            employeeName
        );
    }

    if (branchId) {
        parameters.set(
            "branch_id",
            branchId
        );
    }

    const queryString =
        parameters.toString();

    const downloadUrl =
        queryString
            ? (
                "/api/export/transactions?"
                + queryString
            )
            : "/api/export/transactions";

    const originalButtonText =
        downloadButton.textContent;

    downloadButton.disabled = true;
    downloadButton.textContent =
        "Menyiapkan Excel...";

    try {
        const response = await fetch(
            downloadUrl,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            let errorMessage =
                "Data Excel gagal diunduh.";

            try {
                const errorData =
                    await response.json();

                if (errorData.detail) {
                    errorMessage =
                        errorData.detail;
                }
            } catch (error) {
                console.error(error);
            }

            if (response.status === 401) {
                localStorage.removeItem(
                    "tulip_access_token"
                );

                throw new Error(
                    "Sesi login telah berakhir. Silakan login kembali."
                );
            }

            throw new Error(
                errorMessage
            );
        }

        const excelBlob =
            await response.blob();

        const contentDisposition =
            response.headers.get(
                "Content-Disposition"
            );

        let fileName =
            "Data-Transaksi-TULIP.xlsx";

        if (contentDisposition) {
            const fileNameMatch =
                contentDisposition.match(
                    /filename="?([^"]+)"?/i
                );

            if (
                fileNameMatch
                && fileNameMatch[1]
            ) {
                fileName =
                    fileNameMatch[1];
            }
        }

        const objectUrl =
            URL.createObjectURL(
                excelBlob
            );

        const downloadLink =
            document.createElement(
                "a"
            );

        downloadLink.href =
            objectUrl;

        downloadLink.download =
            fileName;

        document.body.appendChild(
            downloadLink
        );

        downloadLink.click();
        downloadLink.remove();

        URL.revokeObjectURL(
            objectUrl
        );

        showNotification(
            "Data transaksi berhasil diunduh.",
            "success"
        );

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        downloadButton.disabled = false;
        downloadButton.textContent =
            originalButtonText;
    }
}


// ============================================================
// MEMASANG TOMBOL DOWNLOAD EXCEL
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        const downloadButton =
            document.getElementById(
                "downloadExcelButton"
            );

        if (downloadButton) {
            downloadButton.addEventListener(
                "click",
                downloadTransactionsExcel
            );
        }
    }
);

// ============================================================
// 36 — FORM PEMBUATAN AKUN SUPERADMIN
// ============================================================

let adminBranches = [];


function createAdminAccountModal() {
    if (
        document.getElementById(
            "adminAccountModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "adminAccountModal";
    modal.className = "account-modal";
    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="account-modal-backdrop"
            data-close-account-modal
        ></div>

        <section
            class="account-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accountModalTitle"
        >
            <div class="account-modal-header">
                <div>
                    <p class="login-card-label">
                        SUPERADMIN
                    </p>

                    <h2 id="accountModalTitle">
                        Buat Akun Baru
                    </h2>

                    <p>
                        Buat akun Kepala Cabang
                        atau akun Pusat.
                    </p>
                </div>

                <button
                    id="closeAccountModalButton"
                    class="account-modal-close"
                    type="button"
                    aria-label="Tutup formulir"
                >
                    &times;
                </button>
            </div>

            <form
                id="createAdminAccountForm"
                class="account-form"
            >
                <div class="form-group">
                    <label for="adminAccountUsername">
                        Username
                        <span class="required">*</span>
                    </label>

                    <input
                        id="adminAccountUsername"
                        type="text"
                        minlength="4"
                        maxlength="40"
                        placeholder="Contoh: kc.jakarta"
                        autocomplete="off"
                        required
                    >

                    <small class="form-help">
                        Gunakan huruf kecil, angka,
                        titik, garis bawah, atau minus.
                    </small>
                </div>

                <div class="form-group">
                    <label for="adminAccountName">
                        Nama Pengguna
                        <span class="required">*</span>
                    </label>

                    <input
                        id="adminAccountName"
                        type="text"
                        maxlength="200"
                        placeholder="Masukkan nama pengguna"
                        autocomplete="off"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="adminAccountRole">
                        Peran
                        <span class="required">*</span>
                    </label>

                    <select
                        id="adminAccountRole"
                        required
                    >
                        <option value="">
                            Pilih peran
                        </option>

                        <option value="BRANCH_HEAD">
                            Kepala Cabang
                        </option>

                        <option value="HQ">
                            Pusat
                        </option>
                    </select>
                </div>

                <div
                    id="adminAccountBranchGroup"
                    class="form-group"
                    hidden
                >
                    <label for="adminAccountBranch">
                        Cabang
                        <span class="required">*</span>
                    </label>

                    <select id="adminAccountBranch">
                        <option value="">
                            Pilih cabang
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="adminAccountPassword">
                        Password
                        <span class="required">*</span>
                    </label>

                    <input
                        id="adminAccountPassword"
                        type="password"
                        minlength="8"
                        maxlength="100"
                        placeholder="Masukkan password awal"
                        autocomplete="new-password"
                        required
                    >

                    <small class="form-help">
                        Minimal 8 karakter serta memiliki
                        huruf besar, huruf kecil, dan angka.
                    </small>
                </div>

                <div class="account-modal-actions">
                    <button
                        id="cancelCreateAccountButton"
                        class="outline-dark-button"
                        type="button"
                    >
                        Batal
                    </button>

                    <button
                        id="submitCreateAccountButton"
                        class="primary-button"
                        type="submit"
                    >
                        Buat Akun
                    </button>
                </div>
            </form>
        </section>
    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeAccountModalButton"
        )
        .addEventListener(
            "click",
            closeAdminAccountModal
        );

    document
        .getElementById(
            "cancelCreateAccountButton"
        )
        .addEventListener(
            "click",
            closeAdminAccountModal
        );

    modal
        .querySelector(
            "[data-close-account-modal]"
        )
        .addEventListener(
            "click",
            closeAdminAccountModal
        );

    document
        .getElementById(
            "adminAccountRole"
        )
        .addEventListener(
            "change",
            updateAdminBranchRequirement
        );

    document
        .getElementById(
            "createAdminAccountForm"
        )
        .addEventListener(
            "submit",
            submitNewAdminAccount
        );
}


async function loadAdminBranches() {
    const response = await fetch(
        "/api/admin/branches",
        {
            headers:
                authorizationHeaders()
        }
    );

    const data =
        await readJsonResponse(
            response
        );

    if (!response.ok) {
        if (response.status === 401) {
            handleExpiredSession();
        }

        throw new Error(
            getErrorMessage(
                data,
                "Daftar cabang gagal dimuat."
            )
        );
    }

    adminBranches =
        data.filter(
            function (branch) {
                return branch.active;
            }
        );
}


function fillAdminBranchOptions() {
    const branchSelect =
        document.getElementById(
            "adminAccountBranch"
        );

    branchSelect.innerHTML = `
        <option value="">
            Pilih cabang
        </option>
    `;

    adminBranches.forEach(
        function (branch) {
            const option =
                document.createElement(
                    "option"
                );

            option.value =
                branch.id;

            option.textContent =
                branch.name;

            branchSelect.appendChild(
                option
            );
        }
    );
}


async function openCreateAdminAccountModal() {
    try {
        createAdminAccountModal();

        await loadAdminBranches();
        fillAdminBranchOptions();

        document
            .getElementById(
                "createAdminAccountForm"
            )
            .reset();

        updateAdminBranchRequirement();

        document
            .getElementById(
                "adminAccountModal"
            )
            .hidden = false;

        document.body.classList.add(
            "modal-open"
        );

        document
            .getElementById(
                "adminAccountUsername"
            )
            .focus();

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );
    }
}


function closeAdminAccountModal() {
    const modal =
        document.getElementById(
            "adminAccountModal"
        );

    if (modal) {
        modal.hidden = true;
    }

    document.body.classList.remove(
        "modal-open"
    );
}


function updateAdminBranchRequirement() {
    const role =
        document.getElementById(
            "adminAccountRole"
        ).value;

    const branchGroup =
        document.getElementById(
            "adminAccountBranchGroup"
        );

    const branchSelect =
        document.getElementById(
            "adminAccountBranch"
        );

    const branchRequired =
        role === "BRANCH_HEAD";

    branchGroup.hidden =
        !branchRequired;

    branchSelect.required =
        branchRequired;

    if (!branchRequired) {
        branchSelect.value = "";
    }
}


async function submitNewAdminAccount(
    event
) {
    event.preventDefault();

    const submitButton =
        document.getElementById(
            "submitCreateAccountButton"
        );

    const role =
        document.getElementById(
            "adminAccountRole"
        ).value;

    const branchValue =
        document.getElementById(
            "adminAccountBranch"
        ).value;

    const requestData = {
        username:
            document
                .getElementById(
                    "adminAccountUsername"
                )
                .value
                .trim()
                .toLowerCase(),

        name:
            document
                .getElementById(
                    "adminAccountName"
                )
                .value
                .trim(),

        role: role,

        branch_id:
            role === "BRANCH_HEAD"
                ? Number(branchValue)
                : null,

        password:
            document
                .getElementById(
                    "adminAccountPassword"
                )
                .value
    };

    const originalText =
        submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent =
        "Membuat akun...";

    try {
        const response = await fetch(
            "/api/admin/users",
            {
                method: "POST",

                headers: {
                    ...authorizationHeaders(),
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestData
                    )
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            if (response.status === 401) {
                handleExpiredSession();
            }

            throw new Error(
                getErrorMessage(
                    data,
                    "Akun gagal dibuat."
                )
            );
        }

        closeAdminAccountModal();

        showNotification(
            `Akun ${data.username} berhasil dibuat.`,
            "success"
        );

        await loadAdminUsers();

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent =
            originalText;
    }
}


// ============================================================
// 37 — MENGAKTIFKAN TOMBOL BUAT AKUN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        createAdminAccountModal();

        document
            .getElementById(
                "openCreateUserButton"
            )
            ?.addEventListener(
                "click",
                openCreateAdminAccountModal
            );
    }
);

// ============================================================
// 38 — EDIT DAN STATUS AKUN SUPERADMIN
// ============================================================

let managedAdminUsers = [];
let selectedManagedUser = null;


// ============================================================
// MENGGANTI DAFTAR AKUN DENGAN TOMBOL TINDAKAN
// ============================================================

loadAdminUsers = async function () {
    const tableBody =
        document.getElementById(
            "userTableBody"
        );

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td
                class="empty-table"
                colspan="6"
            >
                Memuat daftar pengguna...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            "/api/admin/users",
            {
                headers:
                    authorizationHeaders()
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            if (response.status === 401) {
                handleExpiredSession();
                return;
            }

            throw new Error(
                getErrorMessage(
                    data,
                    "Daftar akun gagal dimuat."
                )
            );
        }

        managedAdminUsers = data;

        if (!data.length) {
            tableBody.innerHTML = `
                <tr>
                    <td
                        class="empty-table"
                        colspan="6"
                    >
                        Belum ada akun.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML =
            data
                .map(
                    createManagedAdminUserRow
                )
                .join("");

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td
                    class="empty-table"
                    colspan="6"
                >
                    ${escapeHtml(
                        error.message
                    )}
                </td>
            </tr>
        `;

        showNotification(
            error.message,
            "error"
        );
    }
};


// ============================================================
// MEMBUAT BARIS DAFTAR AKUN
// ============================================================

function createManagedAdminUserRow(
    user
) {
    const isSuperadmin =
        user.role === "SUPERADMIN";

    const statusClass =
        user.active
            ? "status-active"
            : "status-inactive";

    const statusText =
        user.active
            ? "AKTIF"
            : "TIDAK AKTIF";

    let actionButtons = `
        <span class="table-secondary-text">
            Akun utama dilindungi
        </span>
    `;

    if (!isSuperadmin) {
        actionButtons = `
            <div class="account-table-actions">
                <button
                    class="table-action-button"
                    type="button"
                    data-admin-action="edit"
                    data-user-id="${escapeHtml(
                        user.id
                    )}"
                >
                    Edit
                </button>

                <button
                    class="
                        table-action-button
                        ${
                            user.active
                                ? "account-disable-button"
                                : "account-enable-button"
                        }
                    "
                    type="button"
                    data-admin-action="toggle-status"
                    data-user-id="${escapeHtml(
                        user.id
                    )}"
                >
                    ${
                        user.active
                            ? "Nonaktifkan"
                            : "Aktifkan"
                    }
                </button>
                <button
                    class="table-action-button"
                    type="button"
                    data-admin-action="reset-password"
                    data-user-id="${escapeHtml(
                        user.id
                    )}"
                >
                    Reset Password
                </button>
            </div>
        `;
    }

    return `
        <tr>
            <td>
                <strong>
                    ${escapeHtml(
                        user.username
                    )}
                </strong>
            </td>

            <td>
                ${escapeHtml(
                    user.name
                )}
            </td>

            <td>
                ${escapeHtml(
                    getRoleName(
                        user.role
                    )
                )}
            </td>

            <td>
                ${escapeHtml(
                    user.branch_name || "-"
                )}
            </td>

            <td>
                <span
                    class="
                        status-badge
                        ${statusClass}
                    "
                >
                    ${statusText}
                </span>
            </td>

            <td>
                ${actionButtons}
            </td>
        </tr>
    `;
}


// ============================================================
// MEMBUAT MODAL EDIT AKUN
// ============================================================

function createEditAccountModal() {
    if (
        document.getElementById(
            "editAccountModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "editAccountModal";
    modal.className = "account-modal";
    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="account-modal-backdrop"
            data-close-edit-modal
        ></div>

        <section
            class="account-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editAccountModalTitle"
        >
            <div class="account-modal-header">
                <div>
                    <p class="login-card-label">
                        SUPERADMIN
                    </p>

                    <h2 id="editAccountModalTitle">
                        Edit Akun
                    </h2>

                    <p id="editAccountUsername">
                        Memuat akun...
                    </p>
                </div>

                <button
                    id="closeEditAccountModalButton"
                    class="account-modal-close"
                    type="button"
                    aria-label="Tutup formulir"
                >
                    &times;
                </button>
            </div>

            <form
                id="editAdminAccountForm"
                class="account-form"
            >
                <div class="form-group">
                    <label for="editAdminAccountName">
                        Nama Pengguna
                        <span class="required">*</span>
                    </label>

                    <input
                        id="editAdminAccountName"
                        type="text"
                        maxlength="200"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="editAdminAccountRole">
                        Peran
                        <span class="required">*</span>
                    </label>

                    <select
                        id="editAdminAccountRole"
                        required
                    >
                        <option value="BRANCH_HEAD">
                            Kepala Cabang
                        </option>

                        <option value="HQ">
                            Pusat
                        </option>
                    </select>
                </div>

                <div
                    id="editAdminAccountBranchGroup"
                    class="form-group"
                >
                    <label for="editAdminAccountBranch">
                        Cabang
                        <span class="required">*</span>
                    </label>

                    <select id="editAdminAccountBranch">
                        <option value="">
                            Pilih cabang
                        </option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="editAdminAccountActive">
                        Status Akun
                    </label>

                    <select
                        id="editAdminAccountActive"
                        required
                    >
                        <option value="true">
                            Aktif
                        </option>

                        <option value="false">
                            Tidak Aktif
                        </option>
                    </select>
                </div>

                <div class="account-modal-actions">
                    <button
                        id="cancelEditAccountButton"
                        class="outline-dark-button"
                        type="button"
                    >
                        Batal
                    </button>

                    <button
                        id="saveEditAccountButton"
                        class="primary-button"
                        type="submit"
                    >
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </section>
    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeEditAccountModalButton"
        )
        .addEventListener(
            "click",
            closeEditAccountModal
        );

    document
        .getElementById(
            "cancelEditAccountButton"
        )
        .addEventListener(
            "click",
            closeEditAccountModal
        );

    modal
        .querySelector(
            "[data-close-edit-modal]"
        )
        .addEventListener(
            "click",
            closeEditAccountModal
        );

    document
        .getElementById(
            "editAdminAccountRole"
        )
        .addEventListener(
            "change",
            updateEditAccountBranch
        );

    document
        .getElementById(
            "editAdminAccountForm"
        )
        .addEventListener(
            "submit",
            saveEditedAccount
        );
}


// ============================================================
// MEMBUKA MODAL EDIT
// ============================================================

async function openEditAccountModal(
    userId
) {
    selectedManagedUser =
        managedAdminUsers.find(
            function (user) {
                return (
                    String(user.id)
                    === String(userId)
                );
            }
        );

    if (!selectedManagedUser) {
        showNotification(
            "Data akun tidak ditemukan.",
            "error"
        );

        return;
    }

    try {
        createEditAccountModal();

        await loadAdminBranches();

        const branchSelect =
            document.getElementById(
                "editAdminAccountBranch"
            );

        branchSelect.innerHTML = `
            <option value="">
                Pilih cabang
            </option>
        `;

        adminBranches.forEach(
            function (branch) {
                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    branch.id;

                option.textContent =
                    branch.name;

                branchSelect.appendChild(
                    option
                );
            }
        );

        document
            .getElementById(
                "editAccountUsername"
            )
            .textContent =
                `Username: ${
                    selectedManagedUser.username
                }`;

        document
            .getElementById(
                "editAdminAccountName"
            )
            .value =
                selectedManagedUser.name;

        document
            .getElementById(
                "editAdminAccountRole"
            )
            .value =
                selectedManagedUser.role;

        document
            .getElementById(
                "editAdminAccountBranch"
            )
            .value =
                selectedManagedUser.branch_id
                    || "";

        document
            .getElementById(
                "editAdminAccountActive"
            )
            .value =
                String(
                    selectedManagedUser.active
                );

        updateEditAccountBranch();

        document
            .getElementById(
                "editAccountModal"
            )
            .hidden = false;

        document.body.classList.add(
            "modal-open"
        );

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// MENYESUAIKAN CABANG BERDASARKAN PERAN
// ============================================================

function updateEditAccountBranch() {
    const role =
        document.getElementById(
            "editAdminAccountRole"
        ).value;

    const branchGroup =
        document.getElementById(
            "editAdminAccountBranchGroup"
        );

    const branchSelect =
        document.getElementById(
            "editAdminAccountBranch"
        );

    const branchRequired =
        role === "BRANCH_HEAD";

    branchGroup.hidden =
        !branchRequired;

    branchSelect.required =
        branchRequired;

    if (!branchRequired) {
        branchSelect.value = "";
    }
}


// ============================================================
// MENUTUP MODAL EDIT
// ============================================================

function closeEditAccountModal() {
    const modal =
        document.getElementById(
            "editAccountModal"
        );

    if (modal) {
        modal.hidden = true;
    }

    selectedManagedUser = null;

    document.body.classList.remove(
        "modal-open"
    );
}


// ============================================================
// MENYIMPAN PERUBAHAN AKUN
// ============================================================

async function saveEditedAccount(
    event
) {
    event.preventDefault();

    if (!selectedManagedUser) {
        return;
    }

    const saveButton =
        document.getElementById(
            "saveEditAccountButton"
        );

    const role =
        document.getElementById(
            "editAdminAccountRole"
        ).value;

    const branchValue =
        document.getElementById(
            "editAdminAccountBranch"
        ).value;

    const requestData = {
        name:
            document
                .getElementById(
                    "editAdminAccountName"
                )
                .value
                .trim(),

        role: role,

        branch_id:
            role === "BRANCH_HEAD"
                ? Number(branchValue)
                : null,

        active:
            document
                .getElementById(
                    "editAdminAccountActive"
                )
                .value === "true"
    };

    const originalText =
        saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent =
        "Menyimpan...";

    try {
        const response = await fetch(
            `/api/admin/users/${
                encodeURIComponent(
                    selectedManagedUser.id
                )
            }`,
            {
                method: "PUT",

                headers: {
                    ...authorizationHeaders(),
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestData
                    )
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            if (response.status === 401) {
                handleExpiredSession();
                return;
            }

            throw new Error(
                getErrorMessage(
                    data,
                    "Perubahan akun gagal disimpan."
                )
            );
        }

        closeEditAccountModal();

        showNotification(
            "Perubahan akun berhasil disimpan.",
            "success"
        );

        await loadAdminUsers();

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent =
            originalText;
    }
}


// ============================================================
// MENGAKTIFKAN ATAU MENONAKTIFKAN AKUN
// ============================================================

async function toggleManagedAccountStatus(
    userId
) {
    const user =
        managedAdminUsers.find(
            function (item) {
                return (
                    String(item.id)
                    === String(userId)
                );
            }
        );

    if (!user) {
        showNotification(
            "Data akun tidak ditemukan.",
            "error"
        );

        return;
    }

    const newStatus =
        !user.active;

    const confirmationText =
        newStatus
            ? (
                `Aktifkan kembali akun `
                + `${user.username}?`
            )
            : (
                `Nonaktifkan akun `
                + `${user.username}?`
            );

    if (
        !window.confirm(
            confirmationText
        )
    ) {
        return;
    }

    const requestData = {
        name: user.name,
        role: user.role,
        branch_id:
            user.role === "BRANCH_HEAD"
                ? user.branch_id
                : null,
        active: newStatus
    };

    try {
        const response = await fetch(
            `/api/admin/users/${
                encodeURIComponent(
                    user.id
                )
            }`,
            {
                method: "PUT",

                headers: {
                    ...authorizationHeaders(),
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        requestData
                    )
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                getErrorMessage(
                    data,
                    "Status akun gagal diubah."
                )
            );
        }

        showNotification(
            newStatus
                ? "Akun berhasil diaktifkan."
                : "Akun berhasil dinonaktifkan.",
            "success"
        );

        await loadAdminUsers();

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// MENANGANI TOMBOL PADA TABEL AKUN
// ============================================================

function handleManagedAccountAction(
    event
) {
    const button =
        event.target.closest(
            "[data-admin-action]"
        );

    if (!button) {
        return;
    }

    const action =
        button.dataset.adminAction;

    const userId =
        button.dataset.userId;

    if (action === "edit") {
        openEditAccountModal(
            userId
        );

        return;
    }

    if (action === "toggle-status") {
        toggleManagedAccountStatus(
            userId
        );

        return;
    }

    if (action === "reset-password") {
        showNotification(
            "Form reset password akan diaktifkan pada tahap berikutnya.",
            "error"
        );
    }
}


// ============================================================
// MEMASANG EVENT PENGELOLAAN AKUN
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        createEditAccountModal();

        document
            .getElementById(
                "userTableBody"
            )
            ?.addEventListener(
                "click",
                handleManagedAccountAction
            );
    }
);

// ============================================================
// 39 — RESET PASSWORD AKUN
// ============================================================

let selectedPasswordResetUser = null;


// ============================================================
// MEMBUAT MODAL RESET PASSWORD
// ============================================================

function createResetPasswordModal() {
    if (
        document.getElementById(
            "resetPasswordModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id = "resetPasswordModal";
    modal.className = "account-modal";
    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="account-modal-backdrop"
            data-close-reset-password
        ></div>

        <section
            class="account-modal-card reset-password-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resetPasswordTitle"
        >
            <div class="account-modal-header">
                <div>
                    <p class="login-card-label">
                        SUPERADMIN
                    </p>

                    <h2 id="resetPasswordTitle">
                        Reset Password
                    </h2>

                    <p id="resetPasswordAccountName">
                        Pilih password baru untuk akun.
                    </p>
                </div>

                <button
                    id="closeResetPasswordButton"
                    class="account-modal-close"
                    type="button"
                    aria-label="Tutup formulir"
                >
                    &times;
                </button>
            </div>

            <form
                id="resetPasswordForm"
                class="account-form reset-password-form"
            >
                <div class="form-group">
                    <label for="newManagedPassword">
                        Password Baru
                        <span class="required">*</span>
                    </label>

                    <div class="password-input-wrapper">
                        <input
                            id="newManagedPassword"
                            type="password"
                            minlength="8"
                            maxlength="100"
                            placeholder="Masukkan password baru"
                            autocomplete="new-password"
                            required
                        >

                        <button
                            id="toggleNewManagedPassword"
                            class="password-toggle"
                            type="button"
                        >
                            Lihat
                        </button>
                    </div>

                    <small class="form-help">
                        Minimal 8 karakter serta memiliki
                        huruf besar, huruf kecil, dan angka.
                    </small>
                </div>

                <div class="form-group">
                    <label for="confirmManagedPassword">
                        Konfirmasi Password Baru
                        <span class="required">*</span>
                    </label>

                    <input
                        id="confirmManagedPassword"
                        type="password"
                        minlength="8"
                        maxlength="100"
                        placeholder="Ketik ulang password baru"
                        autocomplete="new-password"
                        required
                    >
                </div>

                <div class="password-warning">
                    <strong>
                        Perhatian
                    </strong>

                    <p>
                        Setelah password diubah, sampaikan
                        password baru kepada pemilik akun
                        melalui saluran yang aman.
                    </p>
                </div>

                <div class="account-modal-actions">
                    <button
                        id="cancelResetPasswordButton"
                        class="outline-dark-button"
                        type="button"
                    >
                        Batal
                    </button>

                    <button
                        id="saveResetPasswordButton"
                        class="primary-button"
                        type="submit"
                    >
                        Simpan Password
                    </button>
                </div>
            </form>
        </section>
    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeResetPasswordButton"
        )
        .addEventListener(
            "click",
            closeResetPasswordModal
        );

    document
        .getElementById(
            "cancelResetPasswordButton"
        )
        .addEventListener(
            "click",
            closeResetPasswordModal
        );

    modal
        .querySelector(
            "[data-close-reset-password]"
        )
        .addEventListener(
            "click",
            closeResetPasswordModal
        );

    document
        .getElementById(
            "toggleNewManagedPassword"
        )
        .addEventListener(
            "click",
            toggleManagedPasswordVisibility
        );

    document
        .getElementById(
            "resetPasswordForm"
        )
        .addEventListener(
            "submit",
            submitManagedPasswordReset
        );
}


// ============================================================
// MEMBUKA MODAL RESET PASSWORD
// ============================================================

function openResetPasswordModal(
    userId
) {
    selectedPasswordResetUser =
        managedAdminUsers.find(
            function (user) {
                return (
                    String(user.id)
                    === String(userId)
                );
            }
        );

    if (!selectedPasswordResetUser) {
        showNotification(
            "Data akun tidak ditemukan.",
            "error"
        );

        return;
    }

    document
        .getElementById(
            "resetPasswordForm"
        )
        .reset();

    document
        .getElementById(
            "resetPasswordAccountName"
        )
        .textContent =
            (
                `Akun: ${
                    selectedPasswordResetUser.username
                } — ${
                    selectedPasswordResetUser.name
                }`
            );

    document
        .getElementById(
            "newManagedPassword"
        )
        .type = "password";

    document
        .getElementById(
            "toggleNewManagedPassword"
        )
        .textContent = "Lihat";

    document
        .getElementById(
            "resetPasswordModal"
        )
        .hidden = false;

    document.body.classList.add(
        "modal-open"
    );

    document
        .getElementById(
            "newManagedPassword"
        )
        .focus();
}


// ============================================================
// MENUTUP MODAL RESET PASSWORD
// ============================================================

function closeResetPasswordModal() {
    const modal =
        document.getElementById(
            "resetPasswordModal"
        );

    if (modal) {
        modal.hidden = true;
    }

    selectedPasswordResetUser = null;

    document.body.classList.remove(
        "modal-open"
    );
}


// ============================================================
// MELIHAT DAN MENYEMBUNYIKAN PASSWORD
// ============================================================

function toggleManagedPasswordVisibility() {
    const passwordInput =
        document.getElementById(
            "newManagedPassword"
        );

    const confirmationInput =
        document.getElementById(
            "confirmManagedPassword"
        );

    const toggleButton =
        document.getElementById(
            "toggleNewManagedPassword"
        );

    const passwordVisible =
        passwordInput.type === "text";

    passwordInput.type =
        passwordVisible
            ? "password"
            : "text";

    confirmationInput.type =
        passwordVisible
            ? "password"
            : "text";

    toggleButton.textContent =
        passwordVisible
            ? "Lihat"
            : "Sembunyikan";
}


// ============================================================
// MENYIMPAN PASSWORD BARU
// ============================================================

async function submitManagedPasswordReset(
    event
) {
    event.preventDefault();

    if (!selectedPasswordResetUser) {
        return;
    }

    const password =
        document
            .getElementById(
                "newManagedPassword"
            )
            .value;

    const passwordConfirmation =
        document
            .getElementById(
                "confirmManagedPassword"
            )
            .value;

    if (
        password !==
        passwordConfirmation
    ) {
        showNotification(
            "Konfirmasi password tidak sama.",
            "error"
        );

        return;
    }

    const saveButton =
        document.getElementById(
            "saveResetPasswordButton"
        );

    const originalText =
        saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent =
        "Menyimpan...";

    try {
        const response = await fetch(
            `/api/admin/users/${
                encodeURIComponent(
                    selectedPasswordResetUser.id
                )
            }/password`,
            {
                method: "PUT",

                headers: {
                    ...authorizationHeaders(),
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        new_password:
                            password
                    })
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            if (response.status === 401) {
                handleExpiredSession();
                return;
            }

            throw new Error(
                getErrorMessage(
                    data,
                    "Password gagal diubah."
                )
            );
        }

        const changedUsername =
            selectedPasswordResetUser
                .username;

        closeResetPasswordModal();

        showNotification(
            `Password akun ${changedUsername} berhasil diubah.`,
            "success"
        );

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent =
            originalText;
    }
}


// ============================================================
// MENGAMBIL KLIK RESET PASSWORD
// Capture digunakan agar pesan sementara sebelumnya tidak muncul.
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        createResetPasswordModal();

        document
            .getElementById(
                "userTableBody"
            )
            ?.addEventListener(
                "click",
                function (event) {
                    const button =
                        event.target.closest(
                            '[data-admin-action="reset-password"]'
                        );

                    if (!button) {
                        return;
                    }

                    event.preventDefault();
                    event.stopImmediatePropagation();

                    openResetPasswordModal(
                        button.dataset.userId
                    );
                },
                true
            );
    }
);

// ============================================================
// 40 — GANTI PASSWORD SUPERADMIN SENDIRI
// ============================================================


// ============================================================
// MEMBUAT TOMBOL GANTI PASSWORD SAYA
// ============================================================

function createChangeMyPasswordButton() {
    if (
        document.getElementById(
            "changeMyPasswordButton"
        )
    ) {
        return;
    }

    const createUserButton =
        document.getElementById(
            "openCreateUserButton"
        );

    if (!createUserButton) {
        return;
    }

    const heading =
        createUserButton.parentElement;

    const actionContainer =
        document.createElement("div");

    actionContainer.className =
        "admin-heading-actions";

    const changePasswordButton =
        document.createElement("button");

    changePasswordButton.id =
        "changeMyPasswordButton";

    changePasswordButton.className =
        "outline-dark-button";

    changePasswordButton.type =
        "button";

    changePasswordButton.textContent =
        "Ganti Password Saya";

    heading.insertBefore(
        actionContainer,
        createUserButton
    );

    actionContainer.appendChild(
        changePasswordButton
    );

    actionContainer.appendChild(
        createUserButton
    );

    changePasswordButton.addEventListener(
        "click",
        openChangeMyPasswordModal
    );
}


// ============================================================
// MEMBUAT MODAL GANTI PASSWORD
// ============================================================

function createChangeMyPasswordModal() {
    if (
        document.getElementById(
            "changeMyPasswordModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "changeMyPasswordModal";

    modal.className =
        "account-modal";

    modal.hidden = true;

    modal.innerHTML = `
        <div
            class="account-modal-backdrop"
            data-close-my-password
        ></div>

        <section
            class="account-modal-card reset-password-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="changeMyPasswordTitle"
        >
            <div class="account-modal-header">
                <div>
                    <p class="login-card-label">
                        KEAMANAN AKUN
                    </p>

                    <h2 id="changeMyPasswordTitle">
                        Ganti Password Saya
                    </h2>

                    <p>
                        Masukkan password lama dan
                        password baru Superadmin.
                    </p>
                </div>

                <button
                    id="closeChangeMyPasswordButton"
                    class="account-modal-close"
                    type="button"
                    aria-label="Tutup formulir"
                >
                    &times;
                </button>
            </div>

            <form
                id="changeMyPasswordForm"
                class="account-form reset-password-form"
            >
                <div class="form-group">
                    <label for="currentAdminPassword">
                        Password Lama
                        <span class="required">*</span>
                    </label>

                    <input
                        id="currentAdminPassword"
                        type="password"
                        minlength="8"
                        maxlength="100"
                        placeholder="Masukkan password lama"
                        autocomplete="current-password"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="newAdminPassword">
                        Password Baru
                        <span class="required">*</span>
                    </label>

                    <div class="password-input-wrapper">
                        <input
                            id="newAdminPassword"
                            type="password"
                            minlength="8"
                            maxlength="100"
                            placeholder="Masukkan password baru"
                            autocomplete="new-password"
                            required
                        >

                        <button
                            id="toggleMyNewPasswordButton"
                            class="password-toggle"
                            type="button"
                        >
                            Lihat
                        </button>
                    </div>

                    <small class="form-help">
                        Minimal 8 karakter serta memiliki
                        huruf besar, huruf kecil, dan angka.
                    </small>
                </div>

                <div class="form-group">
                    <label for="confirmNewAdminPassword">
                        Konfirmasi Password Baru
                        <span class="required">*</span>
                    </label>

                    <input
                        id="confirmNewAdminPassword"
                        type="password"
                        minlength="8"
                        maxlength="100"
                        placeholder="Ketik ulang password baru"
                        autocomplete="new-password"
                        required
                    >
                </div>

                <div class="password-warning">
                    <strong>
                        Perhatian
                    </strong>

                    <p>
                        Setelah password berhasil diganti,
                        Anda akan keluar dan harus login
                        kembali menggunakan password baru.
                    </p>
                </div>

                <div class="account-modal-actions">
                    <button
                        id="cancelChangeMyPasswordButton"
                        class="outline-dark-button"
                        type="button"
                    >
                        Batal
                    </button>

                    <button
                        id="saveMyPasswordButton"
                        class="primary-button"
                        type="submit"
                    >
                        Ganti Password
                    </button>
                </div>
            </form>
        </section>
    `;

    document.body.appendChild(
        modal
    );

    document
        .getElementById(
            "closeChangeMyPasswordButton"
        )
        .addEventListener(
            "click",
            closeChangeMyPasswordModal
        );

    document
        .getElementById(
            "cancelChangeMyPasswordButton"
        )
        .addEventListener(
            "click",
            closeChangeMyPasswordModal
        );

    modal
        .querySelector(
            "[data-close-my-password]"
        )
        .addEventListener(
            "click",
            closeChangeMyPasswordModal
        );

    document
        .getElementById(
            "toggleMyNewPasswordButton"
        )
        .addEventListener(
            "click",
            toggleMyNewPassword
        );

    document
        .getElementById(
            "changeMyPasswordForm"
        )
        .addEventListener(
            "submit",
            submitMyPasswordChange
        );
}


// ============================================================
// MEMBUKA MODAL
// ============================================================

function openChangeMyPasswordModal() {
    const form =
        document.getElementById(
            "changeMyPasswordForm"
        );

    form.reset();

    document
        .getElementById(
            "newAdminPassword"
        )
        .type = "password";

    document
        .getElementById(
            "confirmNewAdminPassword"
        )
        .type = "password";

    document
        .getElementById(
            "toggleMyNewPasswordButton"
        )
        .textContent = "Lihat";

    document
        .getElementById(
            "changeMyPasswordModal"
        )
        .hidden = false;

    document.body.classList.add(
        "modal-open"
    );

    document
        .getElementById(
            "currentAdminPassword"
        )
        .focus();
}


// ============================================================
// MENUTUP MODAL
// ============================================================

function closeChangeMyPasswordModal() {
    const modal =
        document.getElementById(
            "changeMyPasswordModal"
        );

    if (modal) {
        modal.hidden = true;
    }

    document.body.classList.remove(
        "modal-open"
    );
}


// ============================================================
// MELIHAT PASSWORD BARU
// ============================================================

function toggleMyNewPassword() {
    const passwordInput =
        document.getElementById(
            "newAdminPassword"
        );

    const confirmationInput =
        document.getElementById(
            "confirmNewAdminPassword"
        );

    const toggleButton =
        document.getElementById(
            "toggleMyNewPasswordButton"
        );

    const isVisible =
        passwordInput.type === "text";

    passwordInput.type =
        isVisible
            ? "password"
            : "text";

    confirmationInput.type =
        isVisible
            ? "password"
            : "text";

    toggleButton.textContent =
        isVisible
            ? "Lihat"
            : "Sembunyikan";
}


// ============================================================
// MENYIMPAN PASSWORD SUPERADMIN
// ============================================================

async function submitMyPasswordChange(
    event
) {
    event.preventDefault();

    const oldPassword =
        document
            .getElementById(
                "currentAdminPassword"
            )
            .value;

    const newPassword =
        document
            .getElementById(
                "newAdminPassword"
            )
            .value;

    const confirmation =
        document
            .getElementById(
                "confirmNewAdminPassword"
            )
            .value;

    if (
        newPassword !==
        confirmation
    ) {
        showNotification(
            "Konfirmasi password baru tidak sama.",
            "error"
        );

        return;
    }

    if (
        oldPassword ===
        newPassword
    ) {
        showNotification(
            "Password baru tidak boleh sama dengan password lama.",
            "error"
        );

        return;
    }

    const saveButton =
        document.getElementById(
            "saveMyPasswordButton"
        );

    const originalText =
        saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent =
        "Menyimpan...";

    try {
        const response = await fetch(
            "/api/admin/change-my-password",
            {
                method: "PUT",

                headers: {
                    ...authorizationHeaders(),
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        old_password:
                            oldPassword,

                        new_password:
                            newPassword
                    })
            }
        );

        const data =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            if (response.status === 401) {
                handleExpiredSession();
                return;
            }

            throw new Error(
                getErrorMessage(
                    data,
                    "Password gagal diganti."
                )
            );
        }

        closeChangeMyPasswordModal();

        localStorage.removeItem(
            TOKEN_KEY
        );

        currentUser = null;

        showPage("login");

        showNotification(
            "Password berhasil diganti. Silakan login kembali menggunakan password baru.",
            "success"
        );

        document
            .getElementById(
                "username"
            )
            ?.focus();

    } catch (error) {
        showNotification(
            error.message,
            "error"
        );

    } finally {
        saveButton.disabled = false;
        saveButton.textContent =
            originalText;
    }
}


// ============================================================
// MENJALANKAN FITUR GANTI PASSWORD SAYA
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        createChangeMyPasswordModal();
        createChangeMyPasswordButton();
    }
);

// ============================================================
// 41 — MEMBUKA BUKTI DARI LINK EXCEL
// ============================================================

const PENDING_PROOF_KEY =
    "tulip_pending_proof";

let pendingProofInterval = null;


// ============================================================
// MEMBACA LINK BUKTI DARI ALAMAT WEBSITE
// ============================================================

function readProofRequestFromUrl() {
    const parameters =
        new URLSearchParams(
            window.location.search
        );

    const transactionId =
        parameters.get(
            "transaction_id"
        );

    const proofType =
        parameters.get(
            "proof_type"
        );

    if (
        !transactionId
        || !["handover", "transfer"]
            .includes(proofType)
    ) {
        return null;
    }

    return {
        transactionId:
            transactionId,

        proofType:
            proofType
    };
}


// ============================================================
// MENYIMPAN PERMINTAAN BUKTI SEMENTARA
// ============================================================

function savePendingProof(
    proofRequest
) {
    sessionStorage.setItem(
        PENDING_PROOF_KEY,
        JSON.stringify(
            proofRequest
        )
    );
}


// ============================================================
// MEMBACA PERMINTAAN BUKTI TERSIMPAN
// ============================================================

function getPendingProof() {
    const storedValue =
        sessionStorage.getItem(
            PENDING_PROOF_KEY
        );

    if (!storedValue) {
        return null;
    }

    try {
        return JSON.parse(
            storedValue
        );

    } catch (error) {
        sessionStorage.removeItem(
            PENDING_PROOF_KEY
        );

        return null;
    }
}


// ============================================================
// MENGHAPUS PERMINTAAN BUKTI
// ============================================================

function clearPendingProof() {
    sessionStorage.removeItem(
        PENDING_PROOF_KEY
    );

    const cleanUrl =
        window.location.origin
        + window.location.pathname;

    window.history.replaceState(
        {},
        document.title,
        cleanUrl
    );
}


// ============================================================
// MENAMPILKAN NAMA JENIS BUKTI
// ============================================================

function getProofTypeName(
    proofType
) {
    if (proofType === "handover") {
        return "bukti penyerahan";
    }

    return "bukti transfer";
}


// ============================================================
// MEMBUKA FILE BUKTI
// ============================================================

async function openPendingProofFile() {
    const proofRequest =
        getPendingProof();

    if (
        !proofRequest
        || !getToken()
        || !currentUser
    ) {
        return;
    }

    if (pendingProofInterval) {
        clearInterval(
            pendingProofInterval
        );

        pendingProofInterval = null;
    }

    const proofName =
        getProofTypeName(
            proofRequest.proofType
        );

    showNotification(
        `Membuka ${proofName}...`,
        "success"
    );

    try {
        const proofUrl =
            (
                "/api/files/"
                + encodeURIComponent(
                    proofRequest.transactionId
                )
                + "/"
                + encodeURIComponent(
                    proofRequest.proofType
                )
            );

        const response = await fetch(
            proofUrl,
            {
                method: "GET",

                headers:
                    authorizationHeaders()
            }
        );

        if (!response.ok) {
            const data =
                await readJsonResponse(
                    response
                );

            if (response.status === 401) {
                localStorage.removeItem(
                    TOKEN_KEY
                );

                currentUser = null;

                showPage("login");

                showNotification(
                    "Sesi telah berakhir. Silakan login kembali untuk membuka bukti.",
                    "error"
                );

                waitForProofLogin();

                return;
            }

            throw new Error(
                getErrorMessage(
                    data,
                    `${proofName} gagal dibuka.`
                )
            );
        }

        const fileBlob =
            await response.blob();

        const objectUrl =
            URL.createObjectURL(
                fileBlob
            );

        clearPendingProof();

        window.location.assign(
            objectUrl
        );

    } catch (error) {
        clearPendingProof();

        showNotification(
            error.message,
            "error"
        );
    }
}


// ============================================================
// MENUNGGU PENGGUNA LOGIN
// ============================================================

function waitForProofLogin() {
    if (pendingProofInterval) {
        clearInterval(
            pendingProofInterval
        );
    }

    pendingProofInterval =
        window.setInterval(
            function () {
                if (
                    getToken()
                    && currentUser
                ) {
                    clearInterval(
                        pendingProofInterval
                    );

                    pendingProofInterval =
                        null;

                    openPendingProofFile();
                }
            },
            500
        );
}


// ============================================================
// MENANGANI LINK EXCEL SAAT WEBSITE DIBUKA
// ============================================================

function initializeProofLink() {
    const proofRequest =
        readProofRequestFromUrl();

    if (proofRequest) {
        savePendingProof(
            proofRequest
        );
    }

    const pendingProof =
        getPendingProof();

    if (!pendingProof) {
        return;
    }

    if (!getToken()) {
        showPage("login");

        showNotification(
            "Silakan login ke TULIP untuk membuka bukti transaksi.",
            "error"
        );

        document
            .getElementById(
                "username"
            )
            ?.focus();
    }

    waitForProofLogin();
}


// ============================================================
// MENJALANKAN PEMBUKA LINK BUKTI
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {
        window.setTimeout(
            initializeProofLink,
            300
        );
    }
);

