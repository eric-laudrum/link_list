export const getClientId = (): string => {
    let id = localStorage.getItem('link_list_client_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('link_list_client_id', id);
    }
    return id;
};