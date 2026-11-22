require "test_helper"

class CopyProjectTest < ActiveSupport::TestCase
  test "copies saved data into an independent project" do
    source = Project.create!(title: "Loop", data: { version: 1, bpm: 120 })

    copy = CopyProject.call(source)
    copy.update!(title: "Remix", data: { version: 1, bpm: 140 })

    assert_equal "Loop", source.reload.title
    assert_equal 120, source.data.fetch("bpm")
    assert_not_equal source.share_token, copy.share_token
  end
end
