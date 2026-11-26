require "rails_helper"

RSpec.describe "Accounts API", type: :request do
  HEADERS = { "X-Loopa-Request" => "1", "Origin" => "http://127.0.0.1:5173" }.freeze
  PASSWORD = "test-password"

  it "registers and restores the session" do
    register("  Author@Example.com  ")
    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to eq({ "email" => "author@example.com" })
    expect(response.headers["Set-Cookie"]).to include("httponly")
    expect(response.headers["Access-Control-Allow-Credentials"]).to include("true")

    get "/api/session"
    expect(response.parsed_body["email"]).to eq("author@example.com")
  end

  it "ends the active session on sign-out" do
    register("author@example.com")
    delete "/api/session", headers: HEADERS
    expect(response).to have_http_status(:no_content)
    expect(Session.where(user: User.find_by!(email: "author@example.com"))).to be_empty
    get "/api/session"
    expect(response.parsed_body["email"]).to be_nil
  end

  describe "POST /api/session" do
    before { register("author@example.com") }

    context "with the correct password" do
      it "signs in after sign-out" do
        delete "/api/session", headers: HEADERS

        post "/api/session", params: { email: "AUTHOR@example.com", password: PASSWORD },
          headers: HEADERS, as: :json

        expect(response).to have_http_status(:ok)
      end
    end

    context "with the wrong password" do
      it "returns unauthorized" do
        post "/api/session", params: { email: "AUTHOR@example.com", password: "wrong-password" },
          headers: HEADERS, as: :json

        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  it "rejects a duplicate registration" do
    register("author@example.com")
    register("author@example.com")

    expect(response).to have_http_status(:unprocessable_content)
  end

  it "limits project operations to the owner and keeps shared links public" do
    register("owner@example.com")
    post "/api/projects", params: { project: { title: "Loop", data: { version: 1 } } },
      headers: HEADERS, as: :json
    expect(response).to have_http_status(:created)
    id, token = response.parsed_body.values_at("id", "share_token")
    project_path = "/api/projects/#{id}"
    get "/api/projects"
    expect(response.parsed_body.pluck("id")).to eq([id])

    delete project_path, headers: { "Origin" => "https://another.example.com" }
    expect(response).to have_http_status(:forbidden)

    guest = open_session
    guest.get project_path
    expect(guest.response.status).to eq(401)
    guest.get "/api/projects"
    expect(guest.response.status).to eq(401)
    expect do
      guest.post "/api/projects", params: { project: { title: "Guest", data: { version: 1 } } },
        headers: HEADERS, as: :json
      expect(guest.response.status).to eq(401)
      guest.post "/api/shared/#{token}/copy", headers: HEADERS
      expect(guest.response.status).to eq(401)
    end.not_to change(Project, :count)
    guest.get "/api/shared/#{token}"
    expect(guest.response.status).to eq(200)

    register("listener@example.com")
    get "/api/projects"
    expect(response.parsed_body).to be_empty
    get project_path
    expect(response).to have_http_status(:not_found)
    patch project_path, params: { project: { title: "Changed" } }, headers: HEADERS, as: :json
    expect(response).to have_http_status(:not_found)
    post "#{project_path}/samples", headers: HEADERS
    expect(response).to have_http_status(:not_found)
    delete project_path, headers: HEADERS
    expect(response).to have_http_status(:not_found)

    post "/api/shared/#{token}/copy", headers: HEADERS
    expect(response).to have_http_status(:created)
    expect(Project.find(response.parsed_body["id"]).user_id).to eq(User.find_by!(email: "listener@example.com").id)
  end

  it "deletes the current account, its sessions and its projects" do
    other = User.create!(email: "other@example.com", password: PASSWORD)
    other_project = other.projects.create!(title: "Other", data: { version: 1 })
    guest = open_session
    guest.delete "/api/account", headers: HEADERS
    expect(guest.response.status).to eq(401)

    register("delete@example.com")
    user = User.find_by!(email: "delete@example.com")
    project = user.projects.create!(title: "Loop", data: { version: 1 })
    user.sessions.create!

    delete "/api/account", headers: { "Origin" => "https://another.example.com" }
    expect(response).to have_http_status(:forbidden)

    delete "/api/account", headers: HEADERS
    expect(response).to have_http_status(:no_content)
    expect(User).not_to exist(user.id)
    expect(Session).not_to exist(user_id: user.id)
    expect(Project).not_to exist(project.id)
    expect(Project).to exist(other_project.id)

    get "/api/session"
    expect(response.parsed_body["email"]).to be_nil
    get "/api/shared/#{project.share_token}"
    expect(response).to have_http_status(:not_found)
  end

  private

  def register(email)
    post "/api/registration",
      params: { email: email, password: PASSWORD, password_confirmation: PASSWORD },
      headers: HEADERS, as: :json
  end
end
