require "rails_helper"

RSpec.describe "Projects API", type: :request do
  let!(:owner) { register_project_owner }

  it "creates a project and returns its saved document" do
    document = {
      version: 1,
      title: "Loop",
      tracks: [{ id: "lead", sampleId: nil }],
      arrangement: { barCount: 5, lanes: { lead: [nil, "a", nil, "b", nil] } }
    }
    post "/api/projects",
      params: { project: { title: "Loop", data: document, user_id: 123, share_token: "chosen" } },
      headers: RequestHelpers::BROWSER_WRITE_HEADERS, as: :json

    expect(response).to have_http_status(:created)
    created = response.parsed_body
    expect(created["data"]).to eq(document.deep_stringify_keys)
    expect(created["samples"]).to be_empty
    expect(created["share_token"]).not_to eq("chosen")
    expect(Project.find(created["id"]).user_id).to eq(owner.id)

    get "/api/projects/#{created["id"]}"
    expect(response).to have_http_status(:success)
    expect(response.parsed_body).to eq(created)

    get "/api/shared/#{created.fetch("share_token")}"
    expect(response).to have_http_status(:success)
    expect(response.parsed_body["data"]).to eq(document.deep_stringify_keys)
  end

  it "lists project summaries in most recently updated order" do
    older = owner.projects.create!(title: "Old", data: { version: 1 }, updated_at: 2.days.ago)
    recent = owner.projects.create!(title: "Recent", data: { version: 1 }, updated_at: 1.day.ago)

    get "/api/projects"

    expect(response).to have_http_status(:success)
    expect(response.parsed_body.pluck("id")).to eq([recent.id, older.id])
    expect(response.parsed_body.first.keys.sort).to eq(%w[id title updated_at])
  end

  it "updates a project without changing its token" do
    project = owner.projects.create!(title: "Old", data: { version: 1, bpm: 120 })
    token = project.share_token
    document = { version: 1, bpm: 130, arrangement: { barCount: 3, lanes: { lead: [nil, "a", nil] } } }

    patch "/api/projects/#{project.id}",
      params: { project: { title: "New", data: document } },
      headers: RequestHelpers::BROWSER_WRITE_HEADERS, as: :json
    expect(response).to have_http_status(:success)
    expect(response.parsed_body["share_token"]).to eq(token)
    expect(response.parsed_body["data"]).to eq(document.deep_stringify_keys)
  end

  it "rejects an unsupported document version" do
    project = owner.projects.create!(title: "Loop", data: { version: 1, bpm: 130 })
    patch "/api/projects/#{project.id}",
      params: { project: { data: { version: 2 } } }, headers: RequestHelpers::BROWSER_WRITE_HEADERS, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body.dig("errors", "data")).to be_present
  end

  it "preserves the document when the replacement is not an object" do
    project = owner.projects.create!(title: "Loop", data: { version: 1, bpm: 130 })
    patch "/api/projects/#{project.id}",
      params: { project: { data: [] } }, headers: RequestHelpers::BROWSER_WRITE_HEADERS, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    expect(project.reload.data).to eq({ "version" => 1, "bpm" => 130 })
  end

  it "deletes a project and returns JSON for missing projects" do
    project = owner.projects.create!(title: "Loop", data: { version: 1 })

    delete "/api/projects/#{project.id}", headers: RequestHelpers::BROWSER_WRITE_HEADERS
    expect(response).to have_http_status(:no_content)

    get "/api/projects/#{project.id}"
    expect(response).to have_http_status(:not_found)
    expect(response.parsed_body["error"]).to eq("Project not found")
  end

  it "rejects a missing project parameter" do
    post "/api/projects", params: { title: "Loop" }, headers: RequestHelpers::BROWSER_WRITE_HEADERS, as: :json

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body["error"]).to be_present
  end
end
