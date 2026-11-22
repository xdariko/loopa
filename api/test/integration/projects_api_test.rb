require "test_helper"

class ProjectsApiTest < ActionDispatch::IntegrationTest
  test "creates a project and returns its saved document" do
    document = { version: 1, title: "Loop", tracks: [{ id: "lead", sampleId: nil }] }
    post "/api/projects",
      params: { project: { title: "Loop", data: document, user_id: 123, share_token: "chosen" } },
      as: :json

    assert_response :created
    created = response.parsed_body
    assert_equal document.deep_stringify_keys, created["data"]
    assert_empty created["samples"]
    assert_not_equal "chosen", created["share_token"]
    assert_nil Project.find(created["id"]).user_id

    get "/api/projects/#{created["id"]}"
    assert_response :success
    assert_equal created, response.parsed_body
  end

  test "lists project summaries in most recently updated order" do
    older = Project.create!(title: "Old", data: { version: 1 }, updated_at: 2.days.ago)
    recent = Project.create!(title: "Recent", data: { version: 1 }, updated_at: 1.day.ago)

    get "/api/projects"

    assert_response :success
    assert_equal [recent.id, older.id], response.parsed_body.pluck("id")
    assert_equal %w[id title updated_at], response.parsed_body.first.keys.sort
  end

  test "updates a project without changing its token and rejects an unsupported document" do
    project = Project.create!(title: "Old", data: { version: 1, bpm: 120 })
    token = project.share_token

    patch "/api/projects/#{project.id}",
      params: { project: { title: "New", data: { version: 1, bpm: 130 } } }, as: :json
    assert_response :success
    assert_equal token, response.parsed_body["share_token"]
    assert_equal 130, response.parsed_body.dig("data", "bpm")

    patch "/api/projects/#{project.id}",
      params: { project: { data: { version: 2 } } }, as: :json
    assert_response :unprocessable_content
    assert response.parsed_body.dig("errors", "data").present?

    patch "/api/projects/#{project.id}",
      params: { project: { data: [] } }, as: :json
    assert_response :unprocessable_content
    assert_equal({ "version" => 1, "bpm" => 130 }, project.reload.data)
  end

  test "deletes a project and returns JSON for missing projects" do
    project = Project.create!(title: "Loop", data: { version: 1 })

    delete "/api/projects/#{project.id}"
    assert_response :no_content

    get "/api/projects/#{project.id}"
    assert_response :not_found
    assert_equal "Project not found", response.parsed_body["error"]
  end

  test "rejects a missing project parameter" do
    post "/api/projects", params: { title: "Loop" }, as: :json

    assert_response :bad_request
    assert response.parsed_body["error"].present?
  end
end
