require "test_helper"

class AccountsApiTest < ActionDispatch::IntegrationTest
  HEADERS = { "X-Loopa-Request" => "1", "Origin" => "http://127.0.0.1:5173" }.freeze
  PASSWORD = "test-password"

  test "registers, restores the session, signs out and signs in again" do
    register("  Author@Example.com  ")
    assert_response :created
    assert_equal({ "email" => "author@example.com" }, response.parsed_body)
    assert_includes response.headers["Set-Cookie"], "httponly"
    assert_includes response.headers["Access-Control-Allow-Credentials"], "true"

    get "/api/session"
    assert_equal "author@example.com", response.parsed_body["email"]

    delete "/api/session", headers: HEADERS
    assert_response :no_content
    assert_empty Session.where(user: User.find_by!(email: "author@example.com"))
    get "/api/session"
    assert_nil response.parsed_body["email"]

    post "/api/session", params: { email: "AUTHOR@example.com", password: "wrong-password" },
      headers: HEADERS, as: :json
    assert_response :unauthorized
    post "/api/session", params: { email: "AUTHOR@example.com", password: PASSWORD },
      headers: HEADERS, as: :json
    assert_response :success
    register("author@example.com")
    assert_response :unprocessable_content
  end

  test "limits project operations to the owner and keeps shared links public" do
    register("owner@example.com")
    post "/api/projects", params: { project: { title: "Loop", data: { version: 1 } } },
      headers: HEADERS, as: :json
    assert_response :created
    id, token = response.parsed_body.values_at("id", "share_token")
    project_path = "/api/projects/#{id}"
    get "/api/projects"
    assert_equal [id], response.parsed_body.pluck("id")

    delete project_path, headers: { "Origin" => "https://another.example.com" }
    assert_response :forbidden

    guest = open_session
    guest.get project_path
    assert_equal 404, guest.response.status
    guest.get "/api/shared/#{token}"
    assert_equal 200, guest.response.status

    register("listener@example.com")
    get "/api/projects"
    assert_empty response.parsed_body
    get project_path
    assert_response :not_found
    patch project_path, params: { project: { title: "Changed" } }, headers: HEADERS, as: :json
    assert_response :not_found
    post "#{project_path}/samples", headers: HEADERS
    assert_response :not_found
    delete project_path, headers: HEADERS
    assert_response :not_found

    post "/api/shared/#{token}/copy", headers: HEADERS
    assert_response :created
    assert_equal User.find_by!(email: "listener@example.com").id,
      Project.find(response.parsed_body["id"]).user_id
  end

  private

  def register(email)
    post "/api/registration",
      params: { email: email, password: PASSWORD, password_confirmation: PASSWORD },
      headers: HEADERS, as: :json
  end
end
