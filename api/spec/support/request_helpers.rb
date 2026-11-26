module RequestHelpers
  BROWSER_WRITE_HEADERS = { "X-Loopa-Request" => "1" }.freeze

  def register_project_owner
    post "/api/registration", params: { email: "owner@example.com", password: "test-password" },
      headers: BROWSER_WRITE_HEADERS, as: :json
    expect(response).to have_http_status(:created)
    User.find_by!(email: "owner@example.com")
  end
end
